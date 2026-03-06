package api

import (
	time "time"
)

type GreetingData struct {
	Message   string
	Timestamp int64
}

func Greeting(name string) GreetingData {
	timestamp := time.Now().Unix()
	return GreetingData{
		Message:   "Hello, " + name + "!",
		Timestamp: timestamp,
	}
}
