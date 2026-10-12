package handler

import (
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/model"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

func CreateKajian(c fiber.Ctx) error {
	var kajianReq model.KajianReq
	if err := c.Bind().Body(&kajianReq); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "format json salah",
		})
	}

	kajianReq.Judul = strings.TrimSpace(kajianReq.Judul)
	if kajianReq.Judul == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "judul kajian wajib diisi",
		})
	}

	if kajianReq.WaktuMulai.IsZero() {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "waktu mulai wajib diisi",
		})
	}

	waktuMulai := kajianReq.WaktuMulai

	var kajian model.Kajian
	err := database.DB.Where(
		"LOWER(judul) = ? AND waktu_mulai BETWEEN ? AND ? AND LOWER(tempat) = ?",
		strings.ToLower(strings.TrimSpace(kajianReq.Judul)),
		waktuMulai.Add(-30*time.Minute),
		waktuMulai.Add(30*time.Minute),
		strings.ToLower(strings.TrimSpace(kajianReq.Tempat)),
	).First(&kajian).Error

	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(model.APIResponse{
			Success: false,
			Message: "Kajian ini sudah ada di database",
		})
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data di database: " + err.Error(),
		})
	}

	kajian.Judul = kajianReq.Judul
	kajian.Ustadz = kajianReq.Ustadz
	kajian.WaktuMulai = kajianReq.WaktuMulai
	kajian.Kota = kajianReq.Kota
	kajian.Provinsi = kajianReq.Provinsi
	kajian.Status = kajianReq.Status
	kajian.Tempat = kajianReq.Tempat
	kajian.MapUrl = kajianReq.MapUrl
	kajian.PosterURL = kajianReq.PosterURL
	kajian.LiveURL = kajianReq.LiveURL
	kajian.Untuk = kajianReq.Untuk

	if err := database.DB.Create(&kajian).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal menyimpan data ke database: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "data berhasil disimpan",
	})
}

func GetKajian(c fiber.Ctx) error {
	kota := strings.TrimSpace(c.Query("kota"))
	waktu := c.Query("waktu", "pekan_ini")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	query := database.DB.Model(&model.Kajian{})

	if kota != "" {
		query = query.Where("LOWER(kota) = ?", strings.ToLower(kota))
	}

	now := time.Now()
	order := "waktu_mulai ASC"

	switch waktu {
	case "pekan_ini":
		// Senin 00:00 sampai Minggu 23:59:59 minggu berjalan
		daysSinceMonday := (int(now.Weekday()) + 6) % 7
		start := time.Date(now.Year(), now.Month(), now.Day()-daysSinceMonday,
			0, 0, 0, 0, now.Location())
		end := start.AddDate(0, 0, 7)
		query = query.Where("waktu_mulai >= ? AND waktu_mulai  < ?", start, end)
	case "mendatang":
		query = query.Where("waktu_mulai >= ?", now)
	case "lewat":
		query = query.Where("waktu_mulai < ?", now)
		order = "waktu_mulai DESC"
	case "semua":
	default:
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "parameter waktu tidak valid",
		})
	}

	var total int64
	query.Count(&total)

	var list []model.Kajian
	query.Order(order).Limit(limit).Offset((page - 1) * limit).Find(&list)

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Data: fiber.Map{
			"data":  list,
			"total": total,
			"page":  page,
		},
	})
}

func GetKajianByID(c fiber.Ctx) error {
	id := c.Params("id")

	var kajian model.Kajian
	if err := database.DB.First(&kajian, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(model.APIResponse{
				Success: false,
				Message: "data kajian tidak ditemukan",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data di database: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "data berhasil diambil",
		Data:    kajian,
	})
}

func UpdateKajian(c fiber.Ctx) error {
	id := c.Params("id")

	// 1. Cari dulu datanya — kalau nggak ada, 404
	var kajian model.Kajian
	if err := database.DB.First(&kajian, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(model.APIResponse{
				Success: false,
				Message: "data kajian tidak ditemukan",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data di database: " + err.Error(),
		})
	}

	// 2. Bind JSON baru
	var req model.KajianReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "format json salah",
		})
	}

	// 3. Timpa field-nya
	kajian.Judul = req.Judul
	kajian.Ustadz = req.Ustadz
	kajian.WaktuMulai = req.WaktuMulai
	kajian.Kota = req.Kota
	kajian.Provinsi = req.Provinsi
	kajian.Tempat = req.Tempat
	kajian.MapUrl = req.MapUrl
	kajian.PosterURL = req.PosterURL
	kajian.LiveURL = req.LiveURL
	kajian.Untuk = req.Untuk
	kajian.Status = req.Status

	// 4. Simpan
	if err := database.DB.Save(&kajian).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal memperbarui data di database: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "data berhasil diperbarui",
		Data:    kajian,
	})
}

func DeleteKajian(c fiber.Ctx) error {
	id := c.Params("id")

	var kajian model.Kajian
	if err := database.DB.First(&kajian, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(model.APIResponse{
				Success: false,
				Message: "data kajian tidak ditemukan",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data di database: " + err.Error(),
		})
	}

	if err := database.DB.Delete(&kajian).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal menghapus data di database: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "data berhasil dihapus",
	})
}
