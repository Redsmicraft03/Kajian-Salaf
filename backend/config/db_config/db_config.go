package dbconfig

import "os"

var (
	DB_DRIVER   = "postgres"
	DB_HOST     = "127.0.0.1"
	DB_PORT     = "5432"
	DB_NAME     = ""
	DB_USER     = ""
	DB_PASSWORD = ""
	DB_SSLMODE  = "disable"
)

func InitDatabaseConfig() {
	driverEnv := os.Getenv("DB_DRIVER")
	if driverEnv != "" {
		DB_DRIVER = driverEnv
	}

	hostEnv := os.Getenv("DB_HOST")
	if hostEnv != "" {
		DB_HOST = hostEnv
	}

	portEnv := os.Getenv("DB_PORT")
	if portEnv != "" {
		DB_PORT = portEnv
	}

	nameEnv := os.Getenv("DB_NAME")
	if nameEnv != "" {
		DB_NAME = nameEnv
	}

	userEnv := os.Getenv("DB_USER")
	if userEnv != "" {
		DB_USER = userEnv
	}

	passwordEnv := os.Getenv("DB_PASSWORD")
	if passwordEnv != "" {
		DB_PASSWORD = passwordEnv
	}

	sslEnv := os.Getenv("DB_SSLMODE")
	if sslEnv != "" {
		DB_SSLMODE = sslEnv
	}
}
