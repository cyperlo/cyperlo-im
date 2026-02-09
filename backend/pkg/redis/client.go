package redis

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

var Client *redis.Client

type Config struct {
	Host     string
	Port     int
	Password string
	DB       int
}

func Init(config Config) error {
	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)

	Client = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: config.Password,
		DB:       config.DB,
	})

	_, err := Client.Ping(context.Background()).Result()
	if err != nil {
		return fmt.Errorf("failed to connect redis: %w", err)
	}

	log.Printf("Redis connected successfully at %s", addr)
	return nil
}
