package database

import (
	dbconfig "backend-kajian-salaf/config/db_config"
	"backend-kajian-salaf/model"
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	var err error

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta", dbconfig.DB_HOST, dbconfig.DB_USER, dbconfig.DB_PASSWORD, dbconfig.DB_NAME, dbconfig.DB_PORT)
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("tidak dapat terhubung ke database")
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
