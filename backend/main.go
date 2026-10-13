package main

import (
	"backend-kajian-salaf/config"
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/routes"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Ambil data di .env jika ada (jika tidak ada/di Docker, variabel diambil dari environment sistem)
	if err := godotenv.Load(); err != nil {
		log.Println("Info: File .env tidak ditemukan, menggunakan variabel environment sistem/container")
	}

	config.InitConfig()

	// Hubungkan ke database
	database.InitDatabase()

	app := fiber.New()

	// Healthcheck endpoint untuk Docker & Cloudflare Tunnel
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "kajian-salaf-backend",
		})
	})

	// Konfigurasi CORS (default allow all agar lancar diakses oleh Cloudflare Pages & domain kustom)
	corsOrigins := []string{"*"}
	if envOrigins := os.Getenv("CORS_ORIGIN"); envOrigins != "" {
		if envOrigins != "*" {
			origins := strings.Split(envOrigins, ",")
			corsOrigins = make([]string, 0, len(origins))
			for _, o := range origins {
				trimmed := strings.TrimSpace(o)
				if trimmed != "" {
					corsOrigins = append(corsOrigins, trimmed)
				}
			}
		}
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins: corsOrigins,
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
	}))

	routes.InitRoutes(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server Kajian Salaf berjalan di port :%s\n", port)
	log.Fatal(app.Listen(":" + port))
}
