package main

import (
	"log"

	"github.com/cyperlo/im/internal/auth"
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

	api := r.Group("/api/v1/auth")
	{
		api.POST("/register", auth.Register)
		api.POST("/login", auth.Login)
		api.POST("/token/refresh", auth.RefreshToken)
		api.GET("/oauth2/authorize", auth.Authorize)
		api.POST("/oauth2/token", auth.Token)
	}

	log.Println("Auth Service starting on :8081")
	r.Run(":8081")
}
