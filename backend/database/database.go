package database

import (
	dbconfig "backend-kajian-salaf/config/db_config"
	"backend-kajian-salaf/model"
	"fmt"
	"log"

	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	var err error

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		dbconfig.DB_HOST, dbconfig.DB_USER, dbconfig.DB_PASSWORD, dbconfig.DB_NAME, dbconfig.DB_PORT, dbconfig.DB_SSLMODE)

	// Retry connection (berguna saat container DB baru start)
	maxRetries := 10
	for i := 1; i <= maxRetries; i++ {
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		log.Printf("Gagal terhubung ke database (percobaan %d/%d): %v. Menunggu 2 detik...\n", i, maxRetries, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		panic(fmt.Sprintf("tidak dapat terhubung ke database setelah %d percobaan: %v", maxRetries, err))
	}

	err = DB.AutoMigrate(
		&model.User{},
		&model.Kajian{},
		&model.PengajuanKajian{},
	)

	if err != nil {
		log.Println("Gagal Migrate")
	}

	log.Println("Berhasil terhubung ke database")

	// Pastikan data kota & provinsi eksisting di DB seragam baku
	NormalizeExistingWilayah()

	// Jalankan scheduler auto-update status kajian
	StartStatusScheduler()
}

// NormalizeExistingWilayah memeriksa dan merapikan kota & provinsi data lama jika ada inkonsistensi
func NormalizeExistingWilayah() {
	if DB == nil {
		return
	}
	var kajians []model.Kajian
	err := DB.Select("id, kota, provinsi").Find(&kajians).Error
	if err != nil {
		return
	}
	for _, k := range kajians {
		if k.Kota == "" && k.Provinsi == "" {
			continue
		}
		normKota, normProv := NormalizeWilayah(k.Kota, k.Provinsi)
		if normKota != k.Kota || normProv != k.Provinsi {
			DB.Model(&model.Kajian{}).Where("id = ?", k.ID).Updates(map[string]interface{}{
				"kota":     normKota,
				"provinsi": normProv,
			})
		}
	}
}

// AutoUpdateStatusKajian memperbarui status kajian dari 'upcoming' menjadi 'selesai'
// jika waktu_mulai + 2 jam sudah terlewati. Status 'batal' tidak akan disentuh.
func AutoUpdateStatusKajian() {
	if DB == nil {
		return
	}
	cutoff := time.Now().Add(-2 * time.Hour)
	result := DB.Model(&model.Kajian{}).
		Where("waktu_mulai <= ? AND status = ?", cutoff, "upcoming").
		Update("status", "selesai")
	if result.Error != nil {
		log.Printf("Gagal auto-update status kajian: %v\n", result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("Otomatis memperbarui %d kajian menjadi 'selesai'\n", result.RowsAffected)
	}
}

// StartStatusScheduler menjalankan background ticker untuk memperbarui status berkala setiap 10 menit
func StartStatusScheduler() {
	go func() {
		AutoUpdateStatusKajian()
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			AutoUpdateStatusKajian()
		}
	}()
}

