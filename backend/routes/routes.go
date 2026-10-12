package routes

import (
	"backend-kajian-salaf/handler"

	"github.com/gofiber/fiber/v3"
)

func InitRoutes(app *fiber.App) {
	api := app.Group("/api")

	v1 := api.Group("/v1")
	v1.Post("/login", handler.LoginHandler)
	v1.Post("/register", handler.RegisterHandler)

	admin :=  v1.Group("/admin")
	admin.Post("/tambah-kajian", handler.CreateKajian)
	admin.Get("/kajian", handler.GetKajian)

	v1.Get("/kajian", handler.GetKajian)
}