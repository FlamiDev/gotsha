package main

import (
	"embed"
	"encoding/json"
	"gotsha/api"
	"net/http"
)

//go:embed dist/*
var staticFiles embed.FS

func setupServer(ctx *Context, addr string) error {

	http.HandleFunc("/api/App_go/Greeting", func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "Failed to parse form", http.StatusBadRequest)
			return
		}
		var input struct {
			Name string `json:"name"`
		}
		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			http.Error(w, "Failed to decode request body", http.StatusBadRequest)
			return
		}
		data := api.Greeting(input.Name)
		err = json.NewEncoder(w).Encode(data)
		if err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
			return
		}
	})

	http.HandleFunc("/api/Test_go/Test", func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "Failed to parse form", http.StatusBadRequest)
			return
		}
		var input struct {
		}
		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			http.Error(w, "Failed to decode request body", http.StatusBadRequest)
			return
		}
		data := api.Test()
		err = json.NewEncoder(w).Encode(data)
		if err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
			return
		}
	})

	http.Handle("/", http.FileServer(http.FS(staticFiles)))
	return http.ListenAndServe(addr, nil)
}
