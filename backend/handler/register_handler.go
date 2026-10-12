package handler

import (
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/model"
	"backend-kajian-salaf/utils"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

func RegisterHandler(c fiber.Ctx) error {
	var req model.UserRegister
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "format json salah",
		})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)
	req.Name = strings.TrimSpace(req.Name)

	var user model.User
	err := database.DB.Where("LOWER(email) = ?", req.Email).First(&user).Error
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(model.APIResponse{
			Success: false,
			Message: "email sudah digunakan, silahkan gunakan email lain",
		})
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mendapatkan data di database: " + err.Error(),
		})
	}

	password, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal hash password: " + err.Error(),
		})
	}

	user.Name = req.Name
	user.Email = req.Email
	user.Password = password

	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal membuat akun: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "akun berhasil dibuat",
	})
}
