package main

import (
	"log"

	"github.com/cyperlo/im/internal/friend"
	"github.com/cyperlo/im/internal/gateway"
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
			protected.POST("/messages", gateway.SendMessage)
			protected.POST("/friends", friend.AddFriend)
			protected.GET("/friends", friend.GetFriends)
			protected.GET("/users/search", friend.SearchUser)
			protected.GET("/conversations", message.GetHistory)
		}
	}

	log.Println("IM Gateway starting on :8080")
	r.Run(":8080")
}
