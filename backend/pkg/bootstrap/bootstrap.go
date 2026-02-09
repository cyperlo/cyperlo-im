package bootstrap

import (
	"log"
	"os"

	"github.com/cyperlo/im/pkg/database"
	"github.com/cyperlo/im/pkg/redis"
)

func InitAll() error {
	if err := InitDatabase(); err != nil {
		return err
	}

	// if err := InitRedis(); err != nil {
	// 	return err
	// }

	log.Println("All services initialized successfully")
	return nil
}

func InitDatabase() error {
	config := database.Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     3306,
		User:     getEnv("DB_USER", "root"),
		Password: getEnv("DB_PASSWORD", ""),
		DBName:   getEnv("DB_NAME", "im_db"),
	}

	return database.Init(config)
}

func InitRedis() error {
	config := redis.Config{
		Host:     getEnv("REDIS_HOST", "localhost"),
		Port:     6379,
		Password: getEnv("REDIS_PASSWORD", ""),
		DB:       0,
	}

	return redis.Init(config)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
