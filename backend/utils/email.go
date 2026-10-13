package utils

import (
	"backend-kajian-salaf/model"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// SendEmailApproval mengirimkan notifikasi email bahwa usulan kajian telah disetujui dan diterbitkan
func SendEmailApproval(p model.PengajuanKajian) error {
	subject := fmt.Sprintf("Alhamdulillah! Usulan Kajian '%s' Telah Disetujui", p.Judul)

	waktuStr := p.WaktuMulai.Format("02 January 2006, pukul 15:04 WIB")
	lokasiStr := strings.TrimSpace(fmt.Sprintf("%s, %s, %s", p.Tempat, p.Kota, p.Provinsi))
	lokasiStr = strings.Trim(lokasiStr, ", ")

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8faf8; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8e3; }
    .header { background: #065f46; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.85; }
    .body { padding: 28px 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: 700; margin: 0 0 16px; color: #0f172a; }
    .table-info { width: 100%%; border-collapse: collapse; margin: 16px 0; }
    .table-info td { padding: 10px 12px; border-bottom: 1px solid #f1f5f2; font-size: 14px; }
    .table-info td.label { font-weight: 600; color: #64748b; width: 30%%; }
    .table-info td.value { color: #0f172a; }
    .footer { background: #f8faf8; padding: 20px 24px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8e3; }
    .btn { display: inline-block; background: #065f46; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Kajian Salaf</h1>
      <p>Pemberitahuan Usulan Jadwal Kajian</p>
    </div>
    <div class="body">
      <span class="badge">&#10003; Telah Disetujui</span>
      <p>Assalamu'alaikum Warahmatullahi Wabarakatuh, <strong>%s</strong>,</p>
      <p>Alhamdulillah, usulan jadwal kajian yang Anda ajukan telah ditinjau dan <strong>disetujui</strong> oleh Administrator. Jadwal tersebut kini sudah resmi tayang di portal Kajian Salaf.</p>
      
      <table class="table-info">
        <tr>
          <td class="label">Judul Kajian</td>
          <td class="value"><strong>%s</strong></td>
        </tr>
        <tr>
          <td class="label">Pemateri</td>
          <td class="value">%s</td>
        </tr>
        <tr>
          <td class="label">Waktu</td>
          <td class="value">%s</td>
        </tr>
        <tr>
          <td class="label">Lokasi</td>
          <td class="value">%s</td>
        </tr>
      </table>

      <p style="margin-top: 20px;">Semoga menjadi amal jariyah dan sarana tersebarnya ilmu syar'i yang bermanfaat bagi kaum muslimin.</p>
      
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Jazakumullahu khairan wa barakallahu fiikum.<br><em>Tim Admin Jadwal Kajian Salaf</em></p>
    </div>
    <div class="footer">
      Email ini dikirim secara otomatis oleh sistem Jadwal Kajian Salaf.
    </div>
  </div>
</body>
</html>`, p.NamaPengusul, p.Judul, p.Ustadz, waktuStr, lokasiStr)

	return sendRawEmail(p.EmailPengusul, subject, htmlBody)
}

// SendEmailRejection mengirimkan notifikasi email apabila usulan kajian belum dapat disetujui
func SendEmailRejection(p model.PengajuanKajian, alasan string) error {
	subject := fmt.Sprintf("Pemberitahuan Status Usulan Kajian '%s'", p.Judul)

	if strings.TrimSpace(alasan) == "" {
		alasan = "Informasi detail kajian belum mencukupi atau terdapat data yang belum sesuai dengan panduan publikasi."
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8faf8; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8e3; }
    .header { background: #475569; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.85; }
    .body { padding: 28px 24px; }
    .badge { display: inline-block; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    .reason-box { background: #f8fafc; border-left: 4px solid #94a3b8; padding: 14px 16px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #334155; }
    .footer { background: #f8faf8; padding: 20px 24px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8e3; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Kajian Salaf</h1>
      <p>Pemberitahuan Usulan Jadwal Kajian</p>
    </div>
    <div class="body">
      <span class="badge">&#10005; Belum Dapat Diterbitkan</span>
      <p>Assalamu'alaikum Warahmatullahi Wabarakatuh, <strong>%s</strong>,</p>
      <p>Terima kasih atas partisipasi Anda dalam mengajukan jadwal kajian <strong>"%s"</strong>.</p>
      <p>Setelah dilakukan peninjauan, mohon maaf saat ini usulan jadwal tersebut <strong>belum dapat kami terbitkan</strong> dengan catatan berikut:</p>
      
      <div class="reason-box">
        <strong>Catatan Administrator:</strong><br>
        %s
      </div>

      <p>Anda dipersilakan untuk mengajukan kembali usulan jadwal dengan melengkapi data yang diperlukan melalui website Kajian Salaf.</p>
      
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Jazakumullahu khairan atas pengertiannya.<br><em>Tim Admin Jadwal Kajian Salaf</em></p>
    </div>
    <div class="footer">
      Email ini dikirim secara otomatis oleh sistem Jadwal Kajian Salaf.
    </div>
  </div>
</body>
</html>`, p.NamaPengusul, p.Judul, alasan)

	return sendRawEmail(p.EmailPengusul, subject, htmlBody)
}

func sendRawEmail(toEmail, subject, htmlBody string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("SMTP_FROM_EMAIL")
	fromName := os.Getenv("SMTP_FROM_NAME")

	if smtpPort == "" {
		smtpPort = "587"
	}
	if fromName == "" {
		fromName = "Jadwal Kajian Salaf"
	}
	if fromEmail == "" {
		if smtpUser != "" {
			fromEmail = smtpUser
		} else {
			fromEmail = "no-reply@kajiansalaf.id"
		}
	}

	// Jika kredensial SMTP belum diset di .env, simulasikan pengiriman ke log tanpa error
	if smtpUser == "" || smtpPass == "" {
		log.Printf("[SIMULASI EMAIL] SMTP_USER belum diatur di .env. Simulasi pengiriman ke: %s | Subjek: %s\n", toEmail, subject)
		return nil
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("%s <%s>", fromName, fromEmail)
	headers["To"] = toEmail
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"
	headers["Date"] = time.Now().Format(time.RFC1123Z)

	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	err := smtp.SendMail(addr, auth, fromEmail, []string{toEmail}, []byte(message))
	if err != nil {
		log.Printf("[EMAIL ERROR] Gagal mengirim email ke %s: %v\n", toEmail, err)
		return err
	}

	log.Printf("[EMAIL SUKSES] Email berhasil terkirim ke %s (Subjek: %s)\n", toEmail, subject)
	return nil
}
