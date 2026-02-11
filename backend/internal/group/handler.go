package group

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/cyperlo/im/internal/models"
	"github.com/cyperlo/im/pkg/database"
	wsPkg "github.com/cyperlo/im/pkg/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateGroupRequest struct {
	Name    string   `json:"name" binding:"required"`
	Members []string `json:"members" binding:"required"`
}

func CreateGroup(c *gin.Context) {
	userID := c.GetString("user_id")
	log.Printf("CreateGroup called by user: %s", userID)

	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Creating group: name=%s, members=%v", req.Name, req.Members)

	conversationID := uuid.New().String()
	conversation := models.Conversation{
		ID:   conversationID,
		Type: "group",
		Name: req.Name,
	}

	if err := database.DB.Create(&conversation).Error; err != nil {
		log.Printf("Failed to create group conversation: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建群组失败"})
		return
	}

	log.Printf("Group conversation created: id=%s", conversationID)

	members := append(req.Members, userID)
	log.Printf("Adding %d members to group", len(members))

	for _, memberID := range members {
		member := models.ConversationMember{
			ConversationID: conversationID,
			UserID:         memberID,
			JoinedAt:       time.Now(),
		}
		if err := database.DB.Create(&member).Error; err != nil {
			log.Printf("Failed to add member %s: %v", memberID, err)
		} else {
			log.Printf("Added member: %s", memberID)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":   conversationID,
		"name": req.Name,
		"type": "group",
	})

	// 通过WebSocket通知所有成员群组已创建
	notifyGroupCreated(conversationID, req.Name, members)
}

func notifyGroupCreated(conversationID, groupName string, memberIDs []string) {
	wsMsg := map[string]interface{}{
		"type":            "group_created",
		"conversation_id": conversationID,
		"group_name":      groupName,
		"timestamp":       time.Now().Unix(),
	}

	msgBytes, _ := json.Marshal(wsMsg)

	for _, memberID := range memberIDs {
		wsPkg.SendToUser(memberID, msgBytes)
	}
}

func GetGroups(c *gin.Context) {
	userID := c.GetString("user_id")
	log.Printf("GetGroups called for user: %s", userID)

	var members []models.ConversationMember
	if err := database.DB.Where("user_id = ?", userID).Find(&members).Error; err != nil {
		log.Printf("Failed to get members: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取群组失败"})
		return
	}

	log.Printf("Found %d conversation members", len(members))

	var conversationIDs []string
	for _, m := range members {
		conversationIDs = append(conversationIDs, m.ConversationID)
	}

	if len(conversationIDs) == 0 {
		log.Printf("No conversations found, returning empty array")
		c.JSON(http.StatusOK, gin.H{"groups": []interface{}{}})
		return
	}

	log.Printf("Conversation IDs: %v", conversationIDs)

	// 只获取群组会话
	var conversations []models.Conversation
	query := database.DB.Where("id IN ?", conversationIDs)
	if err := query.Find(&conversations).Error; err != nil {
		log.Printf("Failed to get conversations: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取群组失败"})
		return
	}

	log.Printf("Found %d total conversations", len(conversations))
	for _, conv := range conversations {
		log.Printf("Conversation: id=%s, type=%s, name=%s", conv.ID, conv.Type, conv.Name)
	}

	// 过滤群组
	var groupConversations []models.Conversation
	for _, conv := range conversations {
		if conv.Type == "group" {
			groupConversations = append(groupConversations, conv)
		}
	}

	log.Printf("Found %d group conversations after filtering", len(groupConversations))

	if len(groupConversations) == 0 {
		c.JSON(http.StatusOK, gin.H{"groups": []interface{}{}})
		return
	}

	type MessageWithUsername struct {
		models.Message
		SenderUsername string `json:"sender_username"`
	}

	// 获取每个群组最近10条消息
	var allMessages []models.Message
	database.DB.Where("conversation_id IN ?", conversationIDs).
		Order("created_at DESC").
		Limit(10 * len(conversationIDs)).
		Find(&allMessages)

	log.Printf("Found %d messages", len(allMessages))

	// 收集消息发送者ID
	userIDSet := make(map[string]bool)
	for _, msg := range allMessages {
		userIDSet[msg.SenderID] = true
	}

	// 批量获取所有用户信息
	var userIDs []string
	for uid := range userIDSet {
		userIDs = append(userIDs, uid)
	}

	var users []models.User
	if len(userIDs) > 0 {
		database.DB.Select("id, username, email").Where("id IN ?", userIDs).Find(&users)
	}

	// 构建用户映射
	userMap := make(map[string]models.User)
	for _, u := range users {
		userMap[u.ID] = u
	}

	// 构建消息映射
	messageMap := make(map[string][]MessageWithUsername)
	for _, msg := range allMessages {
		username := ""
		if user, ok := userMap[msg.SenderID]; ok {
			username = user.Username
		}
		messageMap[msg.ConversationID] = append(messageMap[msg.ConversationID], MessageWithUsername{
			Message:        msg,
			SenderUsername: username,
		})
	}

	type GroupResult struct {
		ID       string                `json:"id"`
		Type     string                `json:"type"`
		Name     string                `json:"name"`
		Members  []models.User         `json:"members"`
		Messages []MessageWithUsername `json:"messages"`
	}

	// 获取所有群组成员的用户信息
	var allGroupMembers []models.ConversationMember
	var groupIDs []string
	for _, conv := range groupConversations {
		groupIDs = append(groupIDs, conv.ID)
	}
	database.DB.Where("conversation_id IN ?", groupIDs).Find(&allGroupMembers)

	// 收集所有成员ID
	memberUserIDs := make(map[string]bool)
	for _, m := range allGroupMembers {
		memberUserIDs[m.UserID] = true
	}

	// 批量获取成员用户信息
	var memberUserIDList []string
	for uid := range memberUserIDs {
		memberUserIDList = append(memberUserIDList, uid)
	}
	var memberUsers []models.User
	if len(memberUserIDList) > 0 {
		database.DB.Select("id, username, email").Where("id IN ?", memberUserIDList).Find(&memberUsers)
	}

	// 构建成员映射
	memberUserMap := make(map[string]models.User)
	for _, u := range memberUsers {
		memberUserMap[u.ID] = u
	}

	// 构建群组成员映射
	groupMemberMap := make(map[string][]models.User)
	for _, m := range allGroupMembers {
		if user, ok := memberUserMap[m.UserID]; ok {
			groupMemberMap[m.ConversationID] = append(groupMemberMap[m.ConversationID], user)
		}
	}

	var result []GroupResult
	for _, conv := range groupConversations {
		messages := messageMap[conv.ID]
		if messages == nil {
			messages = []MessageWithUsername{}
		}
		members := groupMemberMap[conv.ID]
		if members == nil {
			members = []models.User{}
		}
		result = append(result, GroupResult{
			ID:       conv.ID,
			Type:     conv.Type,
			Name:     conv.Name,
			Members:  members,
			Messages: messages,
		})
	}

	log.Printf("Returning %d groups", len(result))
	c.JSON(http.StatusOK, gin.H{"groups": result})
}

func SendGroupMessage(c *gin.Context) {
	conversationID := c.Param("id")
	userID := c.GetString("user_id")
	log.Printf("SendGroupMessage called: conversationID=%s, userID=%s", conversationID, userID)

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Message content: %s", req.Content)

	msg := models.Message{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		SenderID:       userID,
		SenderType:     "user",
		ContentType:    "text",
		Content:        req.Content,
		Status:         "sent",
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		log.Printf("Failed to save message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "发送失败"})
		return
	}

	log.Printf("Message saved: id=%s", msg.ID)

	// 广播给群组所有成员
	BroadcastToGroup(conversationID, userID, req.Content)

	c.JSON(http.StatusOK, msg)
}

func BroadcastToGroup(conversationID, senderID, content string) {
	log.Printf("BroadcastToGroup called: conversationID=%s, senderID=%s", conversationID, senderID)

	var members []models.ConversationMember
	database.DB.Where("conversation_id = ?", conversationID).Find(&members)
	log.Printf("Found %d members", len(members))

	var sender models.User
	database.DB.Where("id = ?", senderID).First(&sender)
	log.Printf("Sender: id=%s, username=%s", sender.ID, sender.Username)

	var conversation models.Conversation
	database.DB.Where("id = ?", conversationID).First(&conversation)
	log.Printf("Conversation: id=%s, name=%s", conversation.ID, conversation.Name)

	wsMsg := map[string]interface{}{
		"type":            "group_message",
		"conversation_id": conversationID,
		"group_name":      conversation.Name,
		"from":            senderID,
		"from_username":   sender.Username,
		"content":         content,
		"timestamp":       time.Now().Unix(),
	}

	msgBytes, _ := json.Marshal(wsMsg)
	log.Printf("Broadcasting message: %s", string(msgBytes))

	for _, member := range members {
		log.Printf("Sending to member: %s", member.UserID)
		wsPkg.SendToUser(member.UserID, msgBytes)
	}

	log.Printf("Broadcast complete")
}

func LeaveGroup(c *gin.Context) {
	conversationID := c.Param("id")
	userID := c.GetString("user_id")

	if err := database.DB.Where("conversation_id = ? AND user_id = ?", conversationID, userID).Delete(&models.ConversationMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "退出失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已退出群组"})
}

func UpdateGroupName(c *gin.Context) {
	conversationID := c.Param("id")
	userID := c.GetString("user_id")

	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证用户是否是群组成员
	var member models.ConversationMember
	if err := database.DB.Where("conversation_id = ? AND user_id = ?", conversationID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限"})
		return
	}

	// 更新群组名称
	if err := database.DB.Model(&models.Conversation{}).Where("id = ?", conversationID).Update("name", req.Name).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功", "name": req.Name})
}
