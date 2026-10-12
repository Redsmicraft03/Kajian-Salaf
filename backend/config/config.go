package config

import (
	dbconfig "backend-kajian-salaf/config/db_config"
	jwtconfig "backend-kajian-salaf/config/jwt_config"
)

func InitConfig() {
	dbconfig.InitDatabaseConfig()
	jwtconfig.InitJWTConfig()
}