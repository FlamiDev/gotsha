package main

import "gotsha/api"

func main() {
	err := setupServer(&api.Context{}, ":8080")
	if err != nil {
		panic(err)
	}
}
