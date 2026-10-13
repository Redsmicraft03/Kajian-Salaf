package handler

import (
	"backend-kajian-salaf/database"
	"backend-kajian-salaf/model"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/xuri/excelize/v2"
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
	database.AutoUpdateStatusKajian()

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
	database.AutoUpdateStatusKajian()

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

// ==========================================================
// Fitur Bulk Import via Excel (.xlsx / .csv) & Download Template
// ==========================================================

// parseWaktuExcel membantu mengubah teks tanggal dan jam dari Excel menjadi time.Time
func parseWaktuExcel(tglStr, jamStr string) (time.Time, error) {
	tglStr = strings.TrimSpace(tglStr)
	jamStr = strings.TrimSpace(jamStr)

	// Jika jam kosong, default ke 00:00
	if jamStr == "" {
		jamStr = "00:00"
	}

	// Normalisasi titik ke titik dua pada jam, misal 18.30 -> 18:30
	jamStr = strings.ReplaceAll(jamStr, ".", ":")

	// 1. Coba parse jika tglStr sudah memuat tanggal & jam sekaligus
	formatsFull := []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05Z07:00",
		"02/01/2006 15:04",
		"02-01-2006 15:04",
	}
	for _, f := range formatsFull {
		if t, err := time.ParseInLocation(f, tglStr, time.Local); err == nil {
			return t, nil
		}
	}

	// 2. Gabungkan tanggal dan jam, lalu parse
	combined := tglStr + " " + jamStr
	formats := []string{
		"2006-01-02 15:04",
		"2006-01-02 15:04:05",
		"02/01/2006 15:04",
		"02/01/2006 15:04:05",
		"02-01-2006 15:04",
		"02-01-2006 15:04:05",
		"2/1/2006 15:04",
		"2-1-2006 15:04",
	}
	for _, f := range formats {
		if t, err := time.ParseInLocation(f, combined, time.Local); err == nil {
			return t, nil
		}
	}

	return time.Time{}, errors.New("format tanggal atau jam tidak dikenali (gunakan format YYYY-MM-DD dan HH:MM)")
}

// BulkCreateKajian mengimpor banyak data kajian sekaligus dari file Excel (.xlsx) atau CSV
func BulkCreateKajian(c fiber.Ctx) error {
	// 1. Ambil file dari form-data
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "file excel wajib diunggah (field form: 'file')",
		})
	}

	// 2. Validasi format ekstensi file (.xlsx atau .csv)
	filename := strings.ToLower(fileHeader.Filename)
	if !strings.HasSuffix(filename, ".xlsx") && !strings.HasSuffix(filename, ".csv") {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "format file tidak didukung, harap unggah file berekstensi .xlsx atau .csv",
		})
	}

	// 3. Buka file yang diunggah
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.APIResponse{
			Success: false,
			Message: "gagal membuka file: " + err.Error(),
		})
	}
	defer file.Close()

	// 4. Baca semua baris data dari file
	var rows [][]string
	if strings.HasSuffix(filename, ".xlsx") {
		f, err := excelize.OpenReader(file)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
				Success: false,
				Message: "gagal membaca file excel: " + err.Error(),
			})
		}
		defer f.Close()

		sheetName := f.GetSheetName(0)
		if sheetName == "" {
			return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
				Success: false,
				Message: "sheet excel kosong",
			})
		}
		rows, err = f.GetRows(sheetName)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
				Success: false,
				Message: "gagal mengambil baris excel: " + err.Error(),
			})
		}
	} else {
		// Pembacaan format CSV
		reader := csv.NewReader(file)
		rows, err = reader.ReadAll()
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
				Success: false,
				Message: "gagal membaca file csv: " + err.Error(),
			})
		}
	}

	if len(rows) <= 1 {
		return c.Status(fiber.StatusBadRequest).JSON(model.APIResponse{
			Success: false,
			Message: "file excel kosong atau hanya berisi baris judul kolom",
		})
	}

	// 5. Petakan nama kolom header ke index baris
	headerMap := make(map[string]int)
	for idx, colName := range rows[0] {
		cleanName := strings.ToLower(strings.TrimSpace(colName))
		cleanName = strings.ReplaceAll(cleanName, "_", " ")
		headerMap[cleanName] = idx
	}

	// Helper pencari nilai kolom berdasarkan variasi nama header
	getCol := func(row []string, keys ...string) string {
		for _, k := range keys {
			if idx, ok := headerMap[k]; ok && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
		}
		return ""
	}

	// 6. Looping setiap baris data dan simpan ke database
	var totalBerhasil int
	var totalDilewati int
	var errorList []string

	for barisKe := 1; barisKe < len(rows); barisKe++ {
		row := rows[barisKe]
		if len(row) == 0 {
			continue
		}

		judul := getCol(row, "judul", "judul kajian", "judul kajian *", "materi")
		if judul == "" {
			continue // Lewati baris kosong
		}

		ustadz := getCol(row, "ustadz", "pemateri", "nama ustadz")
		tgl := getCol(row, "tanggal", "tgl", "tanggal (yyyy-mm-dd) *", "tanggal kajian", "waktu mulai")
		jam := getCol(row, "jam", "jam (hh:mm) *", "waktu", "jam mulai")
		tempat := getCol(row, "tempat", "nama tempat / masjid", "masjid", "lokasi")
		kota := getCol(row, "kota")
		provinsi := getCol(row, "provinsi")
		untuk := strings.ToLower(getCol(row, "untuk", "sasaran", "sasaran (umum/ikhwan/akhwat)", "jamaah"))
		mapUrl := getCol(row, "map url", "map", "maps", "link google maps", "link maps")
		posterUrl := getCol(row, "poster url", "poster", "link poster", "link gambar poster")
		liveUrl := getCol(row, "live url", "live", "link live streaming", "link live")
		status := strings.ToLower(getCol(row, "status", "status (upcoming/selesai/batal)", "status jadwal"))

		if untuk != "ikhwan" && untuk != "akhwat" {
			untuk = "umum"
		}
		if status != "selesai" && status != "batal" {
			status = "upcoming"
		}

		// Validasi dan konversi tanggal & jam
		waktuMulai, err := parseWaktuExcel(tgl, jam)
		if err != nil {
			errorList = append(errorList, fmt.Sprintf("Baris %d: %v ('%s %s')", barisKe+1, err, tgl, jam))
			continue
		}

		// Cek duplikasi (judul + waktu + tempat)
		var existing model.Kajian
		err = database.DB.Where(
			"LOWER(judul) = ? AND waktu_mulai BETWEEN ? AND ? AND LOWER(tempat) = ?",
			strings.ToLower(judul),
			waktuMulai.Add(-30*time.Minute),
			waktuMulai.Add(30*time.Minute),
			strings.ToLower(tempat),
		).First(&existing).Error

		if err == nil {
			// Sudah ada, lewati agar tidak dobel
			totalDilewati++
			continue
		}

		// Simpan kajian baru ke database
		baru := model.Kajian{
			Judul:      judul,
			Ustadz:     ustadz,
			WaktuMulai: waktuMulai,
			Kota:       kota,
			Provinsi:   provinsi,
			Tempat:     tempat,
			MapUrl:     mapUrl,
			PosterURL:  posterUrl,
			LiveURL:    liveUrl,
			Untuk:      untuk,
			Status:     status,
		}

		if err := database.DB.Create(&baru).Error; err != nil {
			errorList = append(errorList, fmt.Sprintf("Baris %d: gagal simpan ke db (%v)", barisKe+1, err))
			continue
		}

		totalBerhasil++
	}

	pesan := fmt.Sprintf("Impor selesai: %d berhasil ditambahkan, %d dilewati (duplikat).", totalBerhasil, totalDilewati)
	return c.Status(fiber.StatusOK).JSON(model.APIResponse{
		Success: true,
		Message: pesan,
		Data: fiber.Map{
			"total_baris":   len(rows) - 1,
			"berhasil":      totalBerhasil,
			"dilewati":      totalDilewati,
			"catatan_error": errorList,
		},
	})
}

// DownloadTemplateExcel membuat dan mengunduh file template excel (.xlsx) berisikan contoh format data kajian
func DownloadTemplateExcel(c fiber.Ctx) error {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Data Kajian"
	f.SetSheetName("Sheet1", sheet)

	// 1. Header kolom
	headers := []string{
		"Judul Kajian *",
		"Nama Ustadz",
		"Tanggal (YYYY-MM-DD) *",
		"Jam (HH:MM) *",
		"Nama Tempat / Masjid",
		"Kota",
		"Provinsi",
		"Sasaran (umum/ikhwan/akhwat)",
		"Link Google Maps",
		"Link Poster",
		"Link Live Streaming",
		"Status (upcoming/selesai/batal)",
	}

	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	// 2. Baris Contoh 1
	contoh1 := []interface{}{
		"Kitab Tauhid — Bab Ikhlas dan Bahaya Syirik",
		"Ustadz Dr. Firanda Andirja, M.A.",
		"2026-10-18",
		"18:30",
		"Masjid Nurul Iman Blok M",
		"Jakarta",
		"DKI Jakarta",
		"umum",
		"https://maps.google.com/?q=Masjid+Nurul+Iman+Blok+M",
		"https://i.postimg.cc/example/poster1.jpg",
		"https://youtube.com/live/contoh",
		"upcoming",
	}
	for colIdx, val := range contoh1 {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 2)
		f.SetCellValue(sheet, cell, val)
	}

	// 3. Baris Contoh 2
	contoh2 := []interface{}{
		"Kajian Tematik — Meneladani Akhlak Salafus Shalih",
		"Ustadz Abu Yahya Badrusalam, Lc.",
		"2026-10-24",
		"09:00",
		"Masjid Al-Barkah Cileungsi",
		"Bogor",
		"Jawa Barat",
		"umum",
		"https://maps.google.com/?q=Masjid+Al+Barkah+Cileungsi",
		"",
		"",
		"upcoming",
	}
	for colIdx, val := range contoh2 {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 3)
		f.SetCellValue(sheet, cell, val)
	}

	// 4. Atur lebar kolom agar rapi saat dibuka di Microsoft Excel
	f.SetColWidth(sheet, "A", "A", 36)
	f.SetColWidth(sheet, "B", "B", 28)
	f.SetColWidth(sheet, "C", "C", 24)
	f.SetColWidth(sheet, "D", "D", 16)
	f.SetColWidth(sheet, "E", "E", 30)
	f.SetColWidth(sheet, "F", "F", 18)
	f.SetColWidth(sheet, "G", "G", 18)
	f.SetColWidth(sheet, "H", "H", 25)
	f.SetColWidth(sheet, "I", "I", 25)
	f.SetColWidth(sheet, "J", "J", 25)
	f.SetColWidth(sheet, "K", "K", 25)
	f.SetColWidth(sheet, "L", "L", 25)

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=\"template_import_kajian_salaf.xlsx\"")

	return f.Write(c.Response().BodyWriter())
}
