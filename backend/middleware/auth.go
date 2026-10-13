package middleware

import (
	jwtconfig "backend-kajian-salaf/config/jwt_config"
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/model"
	"backend-kajian-salaf/utils"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func Protected() fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(model.APIResponse{
				Success: false,
				Message: "akses ditolak: token autentikasi diperlukan",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(model.APIResponse{
				Success: false,
				Message: "sesi login telah kadaluarsa atau token tidak valid",
			})
		}

		tokenString := parts[1]
		claims, err := utils.ValidateJWT(tokenString, jwtconfig.JWT_secret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(model.APIResponse{
				Success: false,
				Message: "Sesi login telah kadaluarsa atau token tidak valid",
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

func AdminOnly() fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(fiber.StatusForbidden).JSON(model.APIResponse{
				Success: false,
				Message: "Akses ditolak: Fitur ini hanya dapat diakses oleh Administrator",
			})
		}

		// Validasi langsung ke database secara real-time
		var user model.User
		if err := database.DB.Select("id, role").First(&user, userID).Error; err != nil || strings.ToLower(user.Role) != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(model.APIResponse{
				Success: false,
				Message: "Akses ditolak: Akun Anda bukan Administrator",
			})
		}

		return c.Next()
	}
}
