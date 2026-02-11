package main

import (
	"log"

	"github.com/cyperlo/im/internal/friend"
	"github.com/cyperlo/im/internal/gateway"
	"github.com/cyperlo/im/internal/group"
	"github.com/cyperlo/im/internal/message"
	"github.com/cyperlo/im/pkg/bootstrap"
	"github.com/gin-gonic/gin"
)

func main() {
	if err := bootstrap.InitAll(); err != nil {
		log.Fatalf("Failed to initialize services: %v", err)
	}

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		log.Printf("[%s] %s %s", c.Request.Method, c.Request.URL.Path, c.ClientIP())
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/ws", gateway.HandleWebSocket)

	api := r.Group("/api/v1")
	{
		api.POST("/login", gateway.Login)

		protected := api.Group("")
		protected.Use(gateway.AuthMiddleware())
		{
			protected.POST("/messages", func(c *gin.Context) {
				log.Printf("SendMessage called")
				gateway.SendMessage(c)
			})
			protected.POST("/friends", func(c *gin.Context) {
				log.Printf("AddFriend called")
				friend.AddFriend(c)
			})
			protected.GET("/friends", func(c *gin.Context) {
				log.Printf("GetFriends called")
				friend.GetFriends(c)
			})
			protected.GET("/friends/conversations", func(c *gin.Context) {
				log.Printf("GetFriendConversations called")
				friend.GetFriendConversations(c)
			})
			protected.GET("/users/search", func(c *gin.Context) {
				log.Printf("SearchUser called with username: %s", c.Query("username"))
				friend.SearchUser(c)
			})
			protected.POST("/groups", func(c *gin.Context) {
				log.Printf("CreateGroup called")
				group.CreateGroup(c)
			})
			protected.GET("/groups", func(c *gin.Context) {
				log.Printf("GetGroups called")
				group.GetGroups(c)
			})
			protected.POST("/groups/:id/messages", func(c *gin.Context) {
				log.Printf("SendGroupMessage called")
				group.SendGroupMessage(c)
			})
			protected.DELETE("/groups/:id/leave", func(c *gin.Context) {
				log.Printf("LeaveGroup called")
				group.LeaveGroup(c)
			})
			protected.PUT("/groups/:id/name", func(c *gin.Context) {
				log.Printf("UpdateGroupName called")
				group.UpdateGroupName(c)
			})
			protected.DELETE("/messages/:id", func(c *gin.Context) {
				log.Printf("RecallMessage called")
				message.RecallMessage(c)
			})
			protected.DELETE("/friends/:id", func(c *gin.Context) {
				log.Printf("DeleteFriend called")
				friend.DeleteFriend(c)
			})
		}
	}

	log.Println("IM Gateway starting on :8080")
	log.Println("Listening on all interfaces (0.0.0.0:8080)")
	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
