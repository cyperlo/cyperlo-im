package websocket

import (
	"log"
	"sync"

	ws "github.com/gorilla/websocket"
)

type Client struct {
	ID     string
	UserID string
	Conn   *ws.Conn
	Send   chan []byte
}

type Hub struct {
	Clients map[string]*Client
	mu      sync.RWMutex
}

var GlobalHub = &Hub{
	Clients: make(map[string]*Client),
}

func (h *Hub) RegisterClient(userID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.Clients[userID] = client
	log.Printf("Client registered: userID=%s, total clients=%d", userID, len(h.Clients))
}

func (h *Hub) UnregisterClient(userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.Clients, userID)
	log.Printf("Client unregistered: userID=%s, total clients=%d", userID, len(h.Clients))
}

func SendToUser(userID string, message []byte) {
	GlobalHub.mu.RLock()
	defer GlobalHub.mu.RUnlock()

	log.Printf("SendToUser called: userID=%s, registered clients=%d", userID, len(GlobalHub.Clients))

	if client, ok := GlobalHub.Clients[userID]; ok {
		log.Printf("Client found for user %s, sending message", userID)
		select {
		case client.Send <- message:
			log.Printf("Message sent to user %s", userID)
		default:
			log.Printf("Failed to send to user %s: channel full", userID)
		}
	} else {
		log.Printf("Client not found for user %s", userID)
	}
}

func (c *Client) WritePump() {
	defer c.Conn.Close()

	for message := range c.Send {
		if err := c.Conn.WriteMessage(1, message); err != nil {
			log.Printf("Write error: %v", err)
			break
		}
	}
}

func (c *Client) ReadPump(h *Hub, userID string, onMessage func([]byte)) {
	defer func() {
		h.UnregisterClient(userID)
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}
		if onMessage != nil {
			onMessage(message)
		}
	}
}
