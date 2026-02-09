package main

import (
	"log"
	"github.com/gin-gonic/gin"
	"github.com/cyperlo/im/internal/message"
)

func main() {
	r := gin.Default()
	
	api := r.Group("/api/v1/messages")
	{
		api.POST("/", message.SendMessage)
		api.GET("/conversations/:id", message.GetConversation)
		api.GET("/history", message.GetHistory)
	}
	
	log.Println("Message Service starting on :8082")
	r.Run(":8082")
}
