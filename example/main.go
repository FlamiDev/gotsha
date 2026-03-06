package main

func main() {
	err := setupServer(&Context{}, ":8080")
	if err != nil {
		panic(err)
	}
}
