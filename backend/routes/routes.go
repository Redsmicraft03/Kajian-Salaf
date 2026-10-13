package routes

import (
	"backend-kajian-salaf/handler"
	"backend-kajian-salaf/middleware"

	"github.com/gofiber/fiber/v3"
)

func registerRoutes(router fiber.Router) {
	router.Post("/login", handler.LoginHandler)
	router.Post("/register", handler.RegisterHandler)

	admin := router.Group("/admin", middleware.Protected(), middleware.AdminOnly())
	admin.Post("/tambah-kajian", handler.CreateKajian)
	admin.Post("/bulk-kajian", handler.BulkCreateKajian)
	admin.Get("/template-excel", handler.DownloadTemplateExcel)
	admin.Get("/kajian", handler.GetKajian)
	admin.Put("/kajian/:id", handler.UpdateKajian)
	admin.Delete("/kajian/:id", handler.DeleteKajian)

	router.Get("/kajian", handler.GetKajian)
	router.Get("/kajian/:id", handler.GetKajianByID)
	router.Get("/template-excel", handler.DownloadTemplateExcel)
}

func InitRoutes(app *fiber.App) {
	// Route utama: langsung /v1/... (misal: http://localhost:8080/v1/login)
	registerRoutes(app.Group("/v1"))

	// Alias /api/v1/... agar tetap kompatibel
	registerRoutes(app.Group("/api/v1"))
}
