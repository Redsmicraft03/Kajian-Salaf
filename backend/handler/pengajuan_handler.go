package handler

import (
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/model"
	"backend-kajian-salaf/utils"
	"errors"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// CreatePengajuan menangani pengajuan usulan kajian baru dari pengunjung/jamaah
func CreatePengajuan(c fiber.Ctx) error {
	// 1. Parsing payload pengajuan
	var req model.PengajuanReq
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "format data tidak valid",
		})
	}

	// 2. Validasi field wajib
	req.NamaPengusul = strings.TrimSpace(req.NamaPengusul)
	if req.NamaPengusul == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "nama pengusul wajib diisi",
		})
	}

	req.EmailPengusul = strings.TrimSpace(strings.ToLower(req.EmailPengusul))
	if req.EmailPengusul == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "email pengusul wajib diisi untuk pemberitahuan status",
		})
	}
	if _, err := mail.ParseAddress(req.EmailPengusul); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "format alamat email pengusul tidak valid",
		})
	}

	req.Judul = strings.TrimSpace(req.Judul)
	if req.Judul == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "judul atau tema kajian wajib diisi",
		})
	}

	if req.WaktuMulai.IsZero() {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "waktu mulai kajian wajib diisi",
		})
	}

	req.Tempat = strings.TrimSpace(req.Tempat)
	if req.Tempat == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "nama tempat atau masjid kajian wajib diisi",
		})
	}

	// 3. Normalisasi kota & provinsi menggunakan master wilayah resmi
	req.Kota, req.Provinsi = database.NormalizeWilayah(req.Kota, req.Provinsi)

	if req.Untuk != "ikhwan" && req.Untuk != "akhwat" {
		req.Untuk = "umum"
	}

	// 4. Simpan usulan kajian dengan status 'menunggu'
	pengajuan := model.PengajuanKajian{
		NamaPengusul:  req.NamaPengusul,
		EmailPengusul: req.EmailPengusul,
		Catatan:       strings.TrimSpace(req.Catatan),
		Judul:         req.Judul,
		Ustadz:        strings.TrimSpace(req.Ustadz),
		WaktuMulai:    req.WaktuMulai,
		Kota:          req.Kota,
		Provinsi:      req.Provinsi,
		Tempat:        req.Tempat,
		MapUrl:        strings.TrimSpace(req.MapUrl),
		PosterURL:     strings.TrimSpace(req.PosterURL),
		LiveURL:       strings.TrimSpace(req.LiveURL),
		Untuk:         req.Untuk,
		Status:        "menunggu",
	}

	if err := database.DB.Create(&pengajuan).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal menyimpan usulan kajian: " + err.Error(),
		})
	}

	// 5. Kembalikan respon sukses
	return c.Status(fiber.StatusCreated).JSON(model.APIResponse{
		Success: true,
		Message: "Jazakallahu khairan! Usulan jadwal kajian Anda berhasil dikirim dan akan segera ditinjau oleh Administrator.",
		Data:    pengajuan,
	})
}

// GetAdminPengajuan mengambil daftar pengajuan kajian untuk ditinjau oleh administrator
func GetAdminPengajuan(c fiber.Ctx) error {
	// 1. Ambil parameter filter & pagination
	status := strings.ToLower(strings.TrimSpace(c.Query("status", "menunggu")))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// 2. Buat query pencarian
	query := database.DB.Model(&model.PengajuanKajian{})
	if status != "" && status != "semua" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var list []model.PengajuanKajian
	offset := (page - 1) * limit
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&list).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data usulan kajian",
		})
	}

	// 3. Hitung statistik pengajuan per status
	type Stats struct {
		Menunggu  int64 `json:"menunggu"`
		Disetujui int64 `json:"disetujui"`
		Ditolak   int64 `json:"ditolak"`
		Total     int64 `json:"total"`
	}
	var stats Stats
	database.DB.Model(&model.PengajuanKajian{}).Where("status = ?", "menunggu").Count(&stats.Menunggu)
	database.DB.Model(&model.PengajuanKajian{}).Where("status = ?", "disetujui").Count(&stats.Disetujui)
	database.DB.Model(&model.PengajuanKajian{}).Where("status = ?", "ditolak").Count(&stats.Ditolak)
	stats.Total = stats.Menunggu + stats.Disetujui + stats.Ditolak

	// 4. Kembalikan data beserta pagination & statistik
	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Data: fiber.Map{
			"data":   list,
			"total":  total,
			"page":   page,
			"limit":  limit,
			"status": status,
			"stats":  stats,
		},
	})
}

// ApprovePengajuan menyetujui usulan kajian, menerbitkannya ke tabel kajian, dan mengirim email notifikasi
func ApprovePengajuan(c fiber.Ctx) error {
	id := c.Params("id")

	// 1. Cari data pengajuan di database
	var pengajuan model.PengajuanKajian
	if err := database.DB.First(&pengajuan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(model.APIResponse{
				Success: false,
				Message: "data usulan kajian tidak ditemukan",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data usulan: " + err.Error(),
		})
	}

	// 2. Cek apakah sudah pernah disetujui
	if pengajuan.Status == "disetujui" {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "usulan kajian ini sudah pernah disetujui sebelumnya",
		})
	}

	// 3. Masukkan data ke tabel kajian utama
	kajianBaru := model.Kajian{
		Judul:      pengajuan.Judul,
		Ustadz:     pengajuan.Ustadz,
		WaktuMulai: pengajuan.WaktuMulai,
		Kota:       pengajuan.Kota,
		Provinsi:   pengajuan.Provinsi,
		Tempat:     pengajuan.Tempat,
		MapUrl:     pengajuan.MapUrl,
		PosterURL:  pengajuan.PosterURL,
		LiveURL:    pengajuan.LiveURL,
		Untuk:      pengajuan.Untuk,
		Status:     "upcoming",
	}

	if err := database.DB.Create(&kajianBaru).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal menerbitkan kajian ke database utama: " + err.Error(),
		})
	}

	// 4. Update status pengajuan menjadi 'disetujui'
	now := time.Now()
	pengajuan.Status = "disetujui"
	pengajuan.KajianID = &kajianBaru.ID
	pengajuan.DiprosesPada = &now
	database.DB.Save(&pengajuan)

	// 5. Kirimkan email notifikasi ke pengusul secara asinkron (background goroutine)
	go func(p model.PengajuanKajian) {
		utils.SendEmailApproval(p)
	}(pengajuan)

	// 6. Kembalikan respon sukses
	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "Usulan kajian berhasil disetujui, jadwal telah diterbitkan, dan email notifikasi telah dikirimkan ke pengusul.",
		Data:    kajianBaru,
	})
}

// RejectPengajuan menolak usulan kajian dan mengirim email pemberitahuan beserta alasannya
func RejectPengajuan(c fiber.Ctx) error {
	id := c.Params("id")

	// 1. Parsing alasan penolakan
	var req model.ReviewPengajuanReq
	_ = c.Bind().Body(&req)

	// 2. Cari data pengajuan di database
	var pengajuan model.PengajuanKajian
	if err := database.DB.First(&pengajuan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(model.APIResponse{
				Success: false,
				Message: "data usulan kajian tidak ditemukan",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data usulan: " + err.Error(),
		})
	}

	// 3. Update status pengajuan menjadi 'ditolak'
	now := time.Now()
	pengajuan.Status = "ditolak"
	pengajuan.AlasanTolak = strings.TrimSpace(req.AlasanTolak)
	pengajuan.DiprosesPada = &now
	database.DB.Save(&pengajuan)

	// 4. Kirimkan email notifikasi ke pengusul secara asinkron
	go func(p model.PengajuanKajian, alasan string) {
		utils.SendEmailRejection(p, alasan)
	}(pengajuan, req.AlasanTolak)

	// 5. Kembalikan respon sukses
	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "Usulan kajian telah ditolak dan email pemberitahuan telah dikirimkan ke pengusul.",
		Data:    pengajuan,
	})
}

// DeletePengajuan menghapus data arsip usulan kajian
func DeletePengajuan(c fiber.Ctx) error {
	id := c.Params("id")

	// 1. Cari data pengajuan
	var pengajuan model.PengajuanKajian
	if err := database.DB.First(&pengajuan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(model.APIResponse{
				Success: false,
				Message: "data usulan kajian tidak ditemukan",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal mengambil data usulan",
		})
	}

	// 2. Hapus data dari database
	if err := database.DB.Delete(&pengajuan).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal menghapus data usulan",
		})
	}

	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: "data usulan berhasil dihapus",
	})
}
