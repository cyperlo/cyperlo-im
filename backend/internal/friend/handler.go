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

	var user models.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
	})
}
