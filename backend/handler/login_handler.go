package handler

import (
	jwtconfig "backend-kajian-salaf/config/jwt_config"
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/model"
	"backend-kajian-salaf/utils"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

func LoginHandler(c fiber.Ctx) error {
	var req model.UserLogin
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "format json salah",
		})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	var user model.User
	if err := database.DB.Where("LOWER(email) = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusUnauthorized).JSON(model.APIResponse{
				Success: false,
				Message: "email atau password yang anda masukkan salah",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data di database",
		})
	}

	if !utils.CheckPasswordHash(req.Password, user.Password) {
		return c.Status(fiber.StatusUnauthorized).JSON(model.APIResponse{
			Success: false,
			Message: "email atau password yang anda masukkan salah",
		})
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, jwtconfig.JWT_secret, req.RememberMe)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal membuat sesi login " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "Login Berhasil",
		Data: model.LoginResponse{
			Token: token,
			User: model.UserInfo{
				ID:    user.ID,
				Name:  user.Name,
				Email: user.Email,
				Role:  user.Role,
			},
		},
	})
}
