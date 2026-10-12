package model

import (
	"time"

	"gorm.io/gorm"
)

type Kajian struct {
	gorm.Model
	Judul      string    `gorm:"size:200;not null" json:"judul"`
	Ustadz     string    `gorm:"size:100" json:"ustadz"`
	WaktuMulai time.Time `gorm:"index;not null" json:"waktu_mulai"`
	Kota       string    `gorm:"size:100;index" json:"kota"`
	Provinsi   string    `gorm:"size:100" json:"provinsi"`
	Tempat     string    `gorm:"size:200" json:"tempat"`
	MapUrl     string    `gorm:"type:text" json:"map_url"`
	PosterURL  string    `gorm:"type:text" json:"poster_url"`
	LiveURL    string    `gorm:"type:text" json:"live_url"`
	Untuk      string    `gorm:"size:20;default:'umum'" json:"untuk"` // umum, ikhwan, akhwat
	Status     string    `gorm:"size:20;default:'upcoming'" json:"status"`
}

func (Kajian) TableName() string {
	return "kajian"
}

type KajianReq struct {
	Judul      string    `json:"judul"`
	Ustadz     string    `json:"ustadz"`
	WaktuMulai time.Time `json:"waktu_mulai"`
	Kota       string    `json:"kota"`
	Provinsi   string    `json:"provinsi"`
	Tempat     string    `json:"tempat"`
	MapUrl     string    `json:"map_url"`
	PosterURL  string    `json:"poster_url"`
	LiveURL    string    `json:"live_url"`
	Untuk      string    `json:"untuk"`
	Status     string    `json:"status"`
}
