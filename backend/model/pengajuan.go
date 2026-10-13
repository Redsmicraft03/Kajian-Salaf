package model

import (
	"time"

	"gorm.io/gorm"
)

// PengajuanKajian merepresentasikan usulan jadwal kajian yang dikirim oleh jamaah/user
type PengajuanKajian struct {
	gorm.Model
	NamaPengusul  string     `gorm:"size:100;not null" json:"nama_pengusul"`
	EmailPengusul string     `gorm:"size:150;not null;index" json:"email_pengusul"`
	Catatan       string     `gorm:"type:text" json:"catatan"`

	// Detail Kajian
	Judul         string     `gorm:"size:200;not null" json:"judul"`
	Ustadz        string     `gorm:"size:100" json:"ustadz"`
	WaktuMulai    time.Time  `gorm:"not null" json:"waktu_mulai"`
	Kota          string     `gorm:"size:100;index" json:"kota"`
	Provinsi      string     `gorm:"size:100" json:"provinsi"`
	Tempat        string     `gorm:"size:200;not null" json:"tempat"`
	MapUrl        string     `gorm:"type:text" json:"map_url"`
	PosterURL     string     `gorm:"type:text" json:"poster_url"`
	LiveURL       string     `gorm:"type:text" json:"live_url"`
	Untuk         string     `gorm:"size:20;default:'umum'" json:"untuk"`

	// Status & Moderasi
	Status        string     `gorm:"size:30;default:'menunggu';index" json:"status"` // menunggu, disetujui, ditolak
	AlasanTolak   string     `gorm:"type:text" json:"alasan_tolak,omitempty"`
	KajianID      *uint      `json:"kajian_id,omitempty"`
	DiprosesPada  *time.Time `json:"diproses_pada,omitempty"`
}

func (PengajuanKajian) TableName() string {
	return "pengajuan_kajian"
}

// PengajuanReq merepresentasikan payload JSON yang dikirimkan user saat mengajukan kajian
type PengajuanReq struct {
	NamaPengusul  string    `json:"nama_pengusul"`
	EmailPengusul string    `json:"email_pengusul"`
	Catatan       string    `json:"catatan"`
	Judul         string    `json:"judul"`
	Ustadz        string    `json:"ustadz"`
	WaktuMulai    time.Time `json:"waktu_mulai"`
	Kota          string    `json:"kota"`
	Provinsi      string    `json:"provinsi"`
	Tempat        string    `json:"tempat"`
	MapUrl        string    `json:"map_url"`
	PosterURL     string    `json:"poster_url"`
	LiveURL       string    `json:"live_url"`
	Untuk         string    `json:"untuk"`
}

// ReviewPengajuanReq merepresentasikan payload penolakan pengajuan
type ReviewPengajuanReq struct {
	AlasanTolak string `json:"alasan_tolak"`
}
