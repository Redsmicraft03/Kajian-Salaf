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
	)

	if err != nil {
		log.Println("Gagal Migrate")
	}

	log.Println("Berhasil terhubung ke database")
}
