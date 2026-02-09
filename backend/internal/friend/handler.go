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
