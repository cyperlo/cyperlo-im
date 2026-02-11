package friend

import (
	"net/http"
	"time"

	"github.com/cyperlo/im/internal/models"
	"github.com/cyperlo/im/pkg/database"
	"github.com/gin-gonic/gin"
)

func AddFriend(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		FriendID string `json:"friend_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if userID == req.FriendID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不能添加自己为好友"})
		return
	}

	var existingFriend models.Friend
	if err := database.DB.Where("user_id = ? AND friend_id = ?", userID, req.FriendID).First(&existingFriend).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "已经是好友或请求已发送"})
		return
	}

	friend := models.Friend{
		UserID:    userID,
		FriendID:  req.FriendID,
		Status:    "accepted",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&friend).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加好友失败"})
		return
	}

	reverseFriend := models.Friend{
		UserID:    req.FriendID,
		FriendID:  userID,
		Status:    "accepted",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	database.DB.Create(&reverseFriend)

	c.JSON(http.StatusOK, gin.H{"message": "添加成功"})
}

func GetFriends(c *gin.Context) {
	userID := c.GetString("user_id")

	var friends []models.Friend
	if err := database.DB.Where("user_id = ? AND status = ?", userID, "accepted").Find(&friends).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取好友列表失败"})
		return
	}

	var friendIDs []string
	for _, f := range friends {
		friendIDs = append(friendIDs, f.FriendID)
	}

	var users []models.User
	database.DB.Where("id IN ?", friendIDs).Find(&users)

	c.JSON(http.StatusOK, gin.H{"friends": users})
}

func SearchUser(c *gin.Context) {
	username := c.Query("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入用户名"})
		return
	}

	var users []models.User
	// 模糊搜索：支持部分匹配
	if err := database.DB.Where("username LIKE ?", "%"+username+"%").Limit(10).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "搜索失败"})
		return
	}

	if len(users) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	// 如果只有一个结果，返回单个用户（保持向后兼容）
	if len(users) == 1 {
		c.JSON(http.StatusOK, gin.H{
			"id":       users[0].ID,
			"username": users[0].Username,
			"email":    users[0].Email,
		})
		return
	}

	// 多个结果，返回列表
	var result []gin.H
	for _, user := range users {
		result = append(result, gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		})
	}
	c.JSON(http.StatusOK, gin.H{"users": result})
}

func GetFriendConversations(c *gin.Context) {
	userID := c.GetString("user_id")

	var members []models.ConversationMember
	if err := database.DB.Where("user_id = ?", userID).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取会话失败"})
		return
	}

	var conversationIDs []string
	for _, m := range members {
		conversationIDs = append(conversationIDs, m.ConversationID)
	}

	if len(conversationIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"conversations": []interface{}{}})
		return
	}

	// 只获取单聊会话
	var conversations []models.Conversation
	if err := database.DB.Where("id IN ? AND type = ?", conversationIDs, "single").Find(&conversations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取会话失败"})
		return
	}

	// 批量获取所有会话成员
	var allMembers []models.ConversationMember
	database.DB.Where("conversation_id IN ?", conversationIDs).Find(&allMembers)

	// 构建会话成员映射
	memberMap := make(map[string][]string)
	for _, m := range allMembers {
		memberMap[m.ConversationID] = append(memberMap[m.ConversationID], m.UserID)
	}

	// 收集所有需要查询的用户ID
	userIDSet := make(map[string]bool)
	for _, members := range memberMap {
		for _, uid := range members {
			userIDSet[uid] = true
		}
	}

	type MessageWithUsername struct {
		models.Message
		SenderUsername string `json:"sender_username"`
	}

	// 只获取每个会话最近10条消息
	var allMessages []models.Message
	database.DB.Where("conversation_id IN ?", conversationIDs).
		Order("created_at DESC").
		Limit(10 * len(conversationIDs)).
		Find(&allMessages)

	// 收集消息发送者ID
	for _, msg := range allMessages {
		userIDSet[msg.SenderID] = true
	}

	// 批量获取所有用户信息
	var userIDs []string
	for uid := range userIDSet {
		userIDs = append(userIDs, uid)
	}

	var users []models.User
	database.DB.Select("id, username, email").Where("id IN ?", userIDs).Find(&users)

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

	type ConversationResult struct {
		ID        string                `json:"id"`
		Type      string                `json:"type"`
		OtherUser *models.User          `json:"other_user"`
		Messages  []MessageWithUsername `json:"messages"`
	}

	var result []ConversationResult

	for _, conv := range conversations {
		convResult := ConversationResult{
			ID:       conv.ID,
			Type:     conv.Type,
			Messages: messageMap[conv.ID],
		}

		members := memberMap[conv.ID]
		for _, uid := range members {
			if uid != userID {
				if user, ok := userMap[uid]; ok {
					convResult.OtherUser = &user
					break
				}
			}
		}

		if convResult.OtherUser == nil {
			continue
		}

		result = append(result, convResult)
	}

	c.JSON(http.StatusOK, gin.H{"conversations": result})
}

func DeleteFriend(c *gin.Context) {
	userID := c.GetString("user_id")
	friendID := c.Param("id")

	// 删除双向好友关系
	database.DB.Where("user_id = ? AND friend_id = ?", userID, friendID).Delete(&models.Friend{})
	database.DB.Where("user_id = ? AND friend_id = ?", friendID, userID).Delete(&models.Friend{})

	c.JSON(http.StatusOK, gin.H{"message": "已删除好友"})
}
