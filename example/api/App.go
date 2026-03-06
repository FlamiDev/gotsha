package api

import time "time"

type GreetingData struct {
	message   string
	timestamp int64
}

func Greeting(name string) GreetingData {
	timestamp := time.Now().Unix()
	return GreetingData{
		message:   "Hello, " + name + "!",
		timestamp: timestamp,
	}
}
