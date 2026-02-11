package gateway

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/cyperlo/im/internal/auth"
	"github.com/cyperlo/im/internal/message"
	"github.com/cyperlo/im/internal/models"
	"github.com/cyperlo/im/pkg/database"
	"github.com/cyperlo/im/pkg/jwt"
	wsPkg "github.com/cyperlo/im/pkg/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSMessage struct {
	Type         string `json:"type"`
	To           string `json:"to,omitempty"`
	From         string `json:"from,omitempty"`
	FromUsername string `json:"from_username,omitempty"`
	Content      string `json:"content,omitempty"`
	Timestamp    int64  `json:"timestamp,omitempty"`
	MessageID    string `json:"message_id,omitempty"`
}

var hub = &wsPkg.Hub{
	Clients: make(map[string]*wsPkg.Client),
}

func init() {
	wsPkg.GlobalHub = hub
}

func HandleWebSocket(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少 token"})
		return
	}

	claims, err := jwt.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的 token"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &wsPkg.Client{
		ID:     claims.UserID,
		UserID: claims.UserID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	hub.RegisterClient(claims.UserID, client)

	go client.WritePump()
	go client.ReadPump(hub, claims.UserID, func(message []byte) {
		handleWebSocketMessage(message, claims.UserID)
	})
}

func handleWebSocketMessage(message []byte, userID string) {
	var msg WSMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Invalid message: %v", err)
		return
	}

	log.Printf("Received WebSocket message: type=%s, to=%s, from=%s", msg.Type, msg.To, userID)

	msg.From = userID
	msg.Timestamp = getCurrentTimestamp()

	// 获取发送者的 username
	sender := auth.GetUserByID(userID)
	if sender != nil {
		msg.FromUsername = sender.Username
	}

	// 处理消息撤回
	if msg.Type == "recall" {
		log.Printf("Recall message via HTTP API")
		return
	}

	// 处理群组消息
	if msg.Type == "group_message" {
		log.Printf("Processing group message")
		handleGroupMessage(userID, msg.To, msg.Content)
		return
	}

	// 保存消息到数据库
	savedMsg, err := saveMessageToDB(userID, msg.To, msg.Content)
	if err != nil {
		log.Printf("Failed to save message: %v", err)
	} else {
		msg.MessageID = savedMsg.ID
	}

	data, _ := json.Marshal(msg)

	// 根据username查找userID
	toUser := auth.GetUserByUsername(msg.To)
	if toUser != nil {
		wsPkg.SendToUser(toUser.ID, data)
	}
	wsPkg.SendToUser(userID, data)
}

func handleGroupMessage(senderID, groupName, content string) {
	log.Printf("handleGroupMessage called: senderID=%s, groupName=%s, content=%s", senderID, groupName, content)

	// 根据群组名称查找群组
	var conversation models.Conversation
	if err := database.DB.Where("name = ? AND type = ?", groupName, "group").First(&conversation).Error; err != nil {
		log.Printf("Group not found: %s, error: %v", groupName, err)
		return
	}

	log.Printf("Found group: id=%s, name=%s", conversation.ID, conversation.Name)

	// 保存消息
	msg := models.Message{
		ID:             uuid.New().String(),
		ConversationID: conversation.ID,
		SenderID:       senderID,
		SenderType:     "user",
		ContentType:    "text",
		Content:        content,
		Status:         "sent",
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		log.Printf("Failed to save group message: %v", err)
		return
	}

	log.Printf("Message saved: id=%s", msg.ID)

	// 广播给群组所有成员
	var members []models.ConversationMember
	database.DB.Where("conversation_id = ?", conversation.ID).Find(&members)

	log.Printf("Found %d members in group", len(members))

	var sender models.User
	database.DB.Where("id = ?", senderID).First(&sender)

	wsMsg := map[string]interface{}{
		"type":            "group_message",
		"conversation_id": conversation.ID,
		"group_name":      conversation.Name,
		"from":            senderID,
		"from_username":   sender.Username,
		"content":         content,
		"timestamp":       time.Now().Unix(),
	}

	msgBytes, _ := json.Marshal(wsMsg)

	for _, member := range members {
		log.Printf("Sending message to member: %s", member.UserID)
		wsPkg.SendToUser(member.UserID, msgBytes)
	}
}

func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}

func saveMessageToDB(fromUserID, toUsername, content string) (*models.Message, error) {
	// 根据 username 查找 userId
	toUser := auth.GetUserByUsername(toUsername)
	if toUser == nil {
		log.Printf("User not found: %s", toUsername)
		return nil, nil
	}

	conversation, err := message.GetOrCreateConversation(fromUserID, toUser.ID)
	if err != nil {
		return nil, err
	}

	return message.SaveMessage(conversation.ID, fromUserID, content)
}
