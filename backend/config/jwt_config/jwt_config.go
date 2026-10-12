package jwtconfig

import "os"

var JWT_secret = "kajian_salaf_super_secret_jwt_key_2026"

func InitJWTConfig() {
	JWTEnv := os.Getenv("JWT_SECRET")
	if JWTEnv != "" {
		JWT_secret = JWTEnv
	}
}