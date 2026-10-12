package main

import (
	"backend-kajian-salaf/config"
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/routes"
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
)

func main() {
	// ambil data di .env
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	config.InitConfig()

	// Hubungkan ke database
	database.InitDatabase()

	app := fiber.New()

	routes.InitRoutes(app)

	log.Fatal(app.Listen(":8080"))
}
