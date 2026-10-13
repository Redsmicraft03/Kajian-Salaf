# ==========================================
# Build Stage
# ==========================================
FROM golang:alpine AS builder

WORKDIR /app

# Install dependensi sistem yang dibutuhkan untuk build & timezone
RUN apk add --no-cache ca-certificates tzdata

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Salin seluruh source code backend
COPY . .

# Kompilasi binary Go statis tanpa CGO
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server .

# ==========================================
# Production Runtime Stage
# ==========================================
FROM alpine:3.20

WORKDIR /app

# Install certificates untuk panggilan HTTPS luar, tzdata untuk zona waktu WIB, dan curl untuk healthcheck
RUN apk add --no-cache ca-certificates tzdata curl

# Buat non-root user demi keamanan
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Salin binary dari stage builder
COPY --from=builder /app/server /app/server

# Set permission ke non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port aplikasi
EXPOSE 8080

# Health check otomatis untuk Docker / Container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["/app/server"]
