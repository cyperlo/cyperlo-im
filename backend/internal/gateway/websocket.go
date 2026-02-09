package gateway

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/cyperlo/im/internal/auth"
	"github.com/cyperlo/im/internal/message"
	"github.com/cyperlo/im/pkg/jwt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	ID     string
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

type Hub struct {
	Clients    map[string]*Client
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

var hub = &Hub{
	Clients:    make(map[string]*Client),
	Broadcast:  make(chan []byte),
	Register:   make(chan *Client),
	Unregister: make(chan *Client),
}

type WSMessage struct {
	Type         string `json:"type"`
	To           string `json:"to,omitempty"`
	From         string `json:"from,omitempty"`
	FromUsername string `json:"from_username,omitempty"`
	Content      string `json:"content,omitempty"`
	Timestamp    int64  `json:"timestamp,omitempty"`
}

func init() {
	go hub.Run()
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("Client registered: %s", client.UserID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("Client unregistered: %s", client.UserID)

		case message := <-h.Broadcast:
			var msg WSMessage
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("Invalid message format: %v", err)
				continue
			}

			h.mu.RLock()
			// 根据 username 查找 userId
			var toUserID string
			if msg.To != "" {
				toUser := auth.GetUserByUsername(msg.To)
				if toUser != nil {
					toUserID = toUser.ID
				}
			}

			// 发送给接收者
			if toUserID != "" {
				if client, ok := h.Clients[toUserID]; ok {
					select {
					case client.Send <- message:
					default:
						close(client.Send)
						delete(h.Clients, client.UserID)
					}
				}
			}
			// 发送给发送者（回显）
			if msg.From != "" {
				if client, ok := h.Clients[msg.From]; ok {
					select {
					case client.Send <- message:
					default:
					}
				}
			}
			h.mu.RUnlock()
		}
	}
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

	client := &Client{
		ID:     claims.UserID,
		UserID: claims.UserID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

func (c *Client) ReadPump() {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Invalid message: %v", err)
			continue
		}

		msg.From = c.UserID
		msg.Timestamp = getCurrentTimestamp()

		// 获取发送者的 username
		sender := auth.GetUserByID(c.UserID)
		if sender != nil {
			msg.FromUsername = sender.Username
		}

		// 保存消息到数据库
		if err := saveMessageToDB(c.UserID, msg.To, msg.Content); err != nil {
			log.Printf("Failed to save message: %v", err)
		}

		data, _ := json.Marshal(msg)
		hub.Broadcast <- data
	}
}

func (c *Client) WritePump() {
	defer c.Conn.Close()

	for message := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("Write error: %v", err)
			break
		}
	}
}

func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}

func saveMessageToDB(fromUserID, toUsername, content string) error {
	// 根据 username 查找 userId
	toUser := auth.GetUserByUsername(toUsername)
	if toUser == nil {
		log.Printf("User not found: %s", toUsername)
		return nil
	}

	conversation, err := message.GetOrCreateConversation(fromUserID, toUser.ID)
	if err != nil {
		return err
	}

	_, err = message.SaveMessage(conversation.ID, fromUserID, content)
	return err
}
