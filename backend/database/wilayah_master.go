package database

import (
	"strings"
	"unicode"
)

// MasterProvinsi mendefinisikan struktur master data provinsi dan kota/kabupaten resminya
type MasterProvinsi struct {
	Nama string   `json:"nama"`
	Kota []string `json:"kota"`
}

// DaftarWilayahMaster memuat 38 provinsi di Indonesia beserta kota/kabupaten utamanya
var DaftarWilayahMaster = []MasterProvinsi{
	{
		Nama: "DKI Jakarta",
		Kota: []string{
			"Jakarta",
			"Jakarta Pusat",
			"Jakarta Selatan",
			"Jakarta Barat",
			"Jakarta Timur",
			"Jakarta Utara",
			"Kepulauan Seribu",
		},
	},
	{
		Nama: "Jawa Barat",
		Kota: []string{
			"Bandung",
			"Bandung Barat",
			"Bekasi",
			"Bogor",
			"Ciamis",
			"Cianjur",
			"Cirebon",
			"Depok",
			"Garut",
			"Indramayu",
			"Karawang",
			"Kuningan",
			"Majalengka",
			"Pangandaran",
			"Purwakarta",
			"Subang",
			"Sukabumi",
			"Sumedang",
			"Tasikmalaya",
			"Banjar",
			"Cimahi",
		},
	},
	{
		Nama: "Banten",
		Kota: []string{
			"Tangerang",
			"Tangerang Selatan",
			"Serang",
			"Cilegon",
			"Lebak",
			"Pandeglang",
		},
	},
	{
		Nama: "Jawa Tengah",
		Kota: []string{
			"Semarang",
			"Solo (Surakarta)",
			"Banyumas",
			"Batang",
			"Blora",
			"Boyolali",
			"Brebes",
			"Cilacap",
			"Demak",
			"Grobogan",
			"Jepara",
			"Karanganyar",
			"Kebumen",
			"Kendal",
			"Klaten",
			"Kudus",
			"Magelang",
			"Pati",
			"Pekalongan",
			"Pemalang",
			"Purbalingga",
			"Purworejo",
			"Rembang",
			"Salatiga",
			"Sragen",
			"Sukoharjo",
			"Tegal",
			"Temanggung",
			"Wonogiri",
			"Wonosobo",
		},
	},
	{
		Nama: "DI Yogyakarta",
		Kota: []string{
			"Yogyakarta",
			"Bantul",
			"Gunungkidul",
			"Kulon Progo",
			"Sleman",
		},
	},
	{
		Nama: "Jawa Timur",
		Kota: []string{
			"Surabaya",
			"Malang",
			"Sidoarjo",
			"Gresik",
			"Batu",
			"Bangkalan",
			"Banyuwangi",
			"Blitar",
			"Bojonegoro",
			"Bondowoso",
			"Jember",
			"Jombang",
			"Kediri",
			"Lamongan",
			"Lumajang",
			"Madiun",
			"Magetan",
			"Mojokerto",
			"Nganjuk",
			"Ngawi",
			"Pacitan",
			"Pamekasan",
			"Pasuruan",
			"Ponorogo",
			"Probolinggo",
			"Sampang",
			"Situbondo",
			"Sumenep",
			"Trenggalek",
			"Tuban",
			"Tulungagung",
		},
	},
	{
		Nama: "Sumatera Utara",
		Kota: []string{
			"Medan",
			"Binjai",
			"Deli Serdang",
			"Pematangsiantar",
			"Tebing Tinggi",
			"Tanjungbalai",
			"Sibolga",
			"Padangsidimpuan",
			"Asahan",
			"Karo",
			"Langkat",
			"Simalungun",
		},
	},
	{
		Nama: "Sumatera Barat",
		Kota: []string{
			"Padang",
			"Bukittinggi",
			"Payakumbuh",
			"Pariaman",
			"Padang Panjang",
			"Solok",
			"Sawahlunto",
			"Agam",
			"Tanah Datar",
			"Pesisir Selatan",
		},
	},
	{
		Nama: "Riau",
		Kota: []string{
			"Pekanbaru",
			"Dumai",
			"Bengkalis",
			"Kampar",
			"Siak",
			"Pelalawan",
			"Rokan Hilir",
			"Rokan Hulu",
			"Indragiri Hilir",
			"Indragiri Hulu",
			"Kuantan Singingi",
			"Kepulauan Meranti",
		},
	},
	{
		Nama: "Kepulauan Riau",
		Kota: []string{
			"Batam",
			"Tanjungpinang",
			"Bintan",
			"Karimun",
			"Natuna",
			"Lingga",
			"Kepulauan Anambas",
		},
	},
	{
		Nama: "Sumatera Selatan",
		Kota: []string{
			"Palembang",
			"Prabumulih",
			"Lubuklinggau",
			"Pagar Alam",
			"Banyuasin",
			"Ogan Ilir",
			"Ogan Komering Ilir",
			"Muara Enim",
			"Lahat",
		},
	},
	{
		Nama: "Lampung",
		Kota: []string{
			"Bandar Lampung",
			"Metro",
			"Lampung Selatan",
			"Lampung Tengah",
			"Lampung Utara",
			"Lampung Timur",
			"Lampung Barat",
			"Pringsewu",
			"Tanggamus",
			"Pesawaran",
			"Tulang Bawang",
		},
	},
	{
		Nama: "Aceh",
		Kota: []string{
			"Banda Aceh",
			"Sabang",
			"Lhokseumawe",
			"Langsa",
			"Subulussalam",
			"Aceh Besar",
			"Aceh Utara",
			"Aceh Timur",
			"Aceh Barat",
			"Bireuen",
			"Pidie",
		},
	},
	{
		Nama: "Jambi",
		Kota: []string{
			"Jambi",
			"Sungai Penuh",
			"Muaro Jambi",
			"Batanghari",
			"Bungo",
			"Tebo",
			"Merangin",
			"Sarolangun",
			"Kerinci",
		},
	},
	{
		Nama: "Bengkulu",
		Kota: []string{
			"Bengkulu",
			"Bengkulu Utara",
			"Bengkulu Selatan",
			"Bengkulu Tengah",
			"Rejang Lebong",
			"Kepahiang",
			"Mukomuko",
		},
	},
	{
		Nama: "Kepulauan Bangka Belitung",
		Kota: []string{
			"Pangkalpinang",
			"Bangka",
			"Bangka Barat",
			"Bangka Tengah",
			"Bangka Selatan",
			"Belitung",
			"Belitung Timur",
		},
	},
	{
		Nama: "Bali",
		Kota: []string{
			"Denpasar",
			"Badung",
			"Gianyar",
			"Tabanan",
			"Buleleng",
			"Karangasem",
			"Klungkung",
			"Bangli",
			"Jembrana",
		},
	},
	{
		Nama: "Nusa Tenggara Barat",
		Kota: []string{
			"Mataram",
			"Bima",
			"Lombok Barat",
			"Lombok Tengah",
			"Lombok Timur",
			"Lombok Utara",
			"Sumbawa",
			"Sumbawa Barat",
			"Dompu",
		},
	},
	{
		Nama: "Nusa Tenggara Timur",
		Kota: []string{
			"Kupang",
			"Ende",
			"Sikka",
			"Flores Timur",
			"Manggarai",
			"Manggarai Barat",
			"Alor",
			"Sumba Timur",
		},
	},
	{
		Nama: "Kalimantan Barat",
		Kota: []string{
			"Pontianak",
			"Singkawang",
			"Kubu Raya",
			"Sambas",
			"Mempawah",
			"Ketapang",
			"Sintang",
		},
	},
	{
		Nama: "Kalimantan Selatan",
		Kota: []string{
			"Banjarmasin",
			"Banjarbaru",
			"Banjar",
			"Barito Kuala",
			"Tanah Laut",
			"Tanah Bumbu",
			"Kotabaru",
			"Tabalong",
		},
	},
	{
		Nama: "Kalimantan Timur",
		Kota: []string{
			"Samarinda",
			"Balikpapan",
			"Bontang",
			"Kutai Kartanegara",
			"Kutai Timur",
			"Paser",
			"Berau",
			"Penajam Paser Utara",
		},
	},
	{
		Nama: "Kalimantan Tengah",
		Kota: []string{
			"Palangka Raya",
			"Kotawaringin Barat",
			"Kotawaringin Timur",
			"Kapuas",
			"Barito Selatan",
			"Barito Utara",
		},
	},
	{
		Nama: "Kalimantan Utara",
		Kota: []string{
			"Tarakan",
			"Bulungan",
			"Nunukan",
			"Malinau",
		},
	},
	{
		Nama: "Sulawesi Selatan",
		Kota: []string{
			"Makassar",
			"Gowa",
			"Maros",
			"Pangkajene dan Kepulauan",
			"Barru",
			"Bone",
			"Parepare",
			"Palopo",
			"Luwu",
			"Luwu Timur",
			"Luwu Utara",
			"Wajo",
			"Soppeng",
			"Sidrap",
			"Pinrang",
			"Bulukumba",
			"Bantaeng",
			"Sinjai",
		},
	},
	{
		Nama: "Sulawesi Utara",
		Kota: []string{
			"Manado",
			"Bitung",
			"Tomohon",
			"Kotamobagu",
			"Minahasa",
			"Minahasa Utara",
			"Minahasa Selatan",
		},
	},
	{
		Nama: "Sulawesi Tengah",
		Kota: []string{
			"Palu",
			"Donggala",
			"Sigi",
			"Parigi Moutong",
			"Poso",
			"Tolitoli",
			"Banggai",
			"Morowali",
		},
	},
	{
		Nama: "Sulawesi Tenggara",
		Kota: []string{
			"Kendari",
			"Baubau",
			"Konawe",
			"Konawe Selatan",
			"Kolaka",
			"Muna",
			"Buton",
			"Wakatobi",
		},
	},
	{
		Nama: "Sulawesi Barat",
		Kota: []string{
			"Mamuju",
			"Majene",
			"Polewali Mandar",
			"Pasangkayu",
			"Mamasa",
		},
	},
	{
		Nama: "Gorontalo",
		Kota: []string{
			"Gorontalo",
			"Bone Bolango",
			"Gorontalo Utara",
			"Pohuwato",
			"Boalemo",
		},
	},
	{
		Nama: "Maluku",
		Kota: []string{
			"Ambon",
			"Tual",
			"Maluku Tengah",
			"Seram Bagian Barat",
			"Buru",
		},
	},
	{
		Nama: "Maluku Utara",
		Kota: []string{
			"Ternate",
			"Tidore Kepulauan",
			"Halmahera Utara",
			"Halmahera Selatan",
		},
	},
	{
		Nama: "Papua",
		Kota: []string{
			"Jayapura",
			"Keerom",
			"Sarmi",
		},
	},
	{
		Nama: "Papua Barat",
		Kota: []string{
			"Manokwari",
			"Fakfak",
			"Kaimana",
			"Teluk Bintuni",
		},
	},
	{
		Nama: "Papua Barat Daya",
		Kota: []string{
			"Sorong",
			"Raja Ampat",
		},
	},
	{
		Nama: "Papua Selatan",
		Kota: []string{
			"Merauke",
			"Boven Digoel",
			"Asmat",
		},
	},
	{
		Nama: "Papua Tengah",
		Kota: []string{
			"Nabire",
			"Mimika",
		},
	},
	{
		Nama: "Papua Pegunungan",
		Kota: []string{
			"Jayawijaya",
			"Yahukimo",
		},
	},
}

// Map lookup internal untuk normalisasi cepat (O(1))
var mapProvinsiCanonical = make(map[string]string)
var mapKotaToProvinsi = make(map[string]string)
var mapKotaCanonical = make(map[string]string)

func cleanKey(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	// Buang awalan umum
	s = strings.TrimPrefix(s, "kota ")
	s = strings.TrimPrefix(s, "kabupaten ")
	s = strings.TrimPrefix(s, "kab. ")
	s = strings.TrimPrefix(s, "kab ")
	s = strings.TrimPrefix(s, "provinsi ")
	s = strings.TrimPrefix(s, "prov. ")
	s = strings.TrimPrefix(s, "prov ")
	return strings.TrimSpace(s)
}

func init() {
	// Inisialisasi map pencarian cepat
	for _, prov := range DaftarWilayahMaster {
		provKey := cleanKey(prov.Nama)
		mapProvinsiCanonical[provKey] = prov.Nama
		mapProvinsiCanonical[strings.ToLower(prov.Nama)] = prov.Nama

		for _, kota := range prov.Kota {
			kKey := cleanKey(kota)
			mapKotaCanonical[kKey] = kota
			mapKotaCanonical[strings.ToLower(kota)] = kota
			mapKotaToProvinsi[kKey] = prov.Nama
			mapKotaToProvinsi[strings.ToLower(kota)] = prov.Nama
		}
	}

	// Alias khusus yang umum digunakan
	// DKI Jakarta
	mapProvinsiCanonical["dki"] = "DKI Jakarta"
	mapProvinsiCanonical["jakarta"] = "DKI Jakarta"
	mapKotaCanonical["jkt"] = "Jakarta"
	mapKotaToProvinsi["jkt"] = "DKI Jakarta"
	mapKotaCanonical["jaksel"] = "Jakarta Selatan"
	mapKotaToProvinsi["jaksel"] = "DKI Jakarta"
	mapKotaCanonical["jaktim"] = "Jakarta Timur"
	mapKotaToProvinsi["jaktim"] = "DKI Jakarta"
	mapKotaCanonical["jakpus"] = "Jakarta Pusat"
	mapKotaToProvinsi["jakpus"] = "DKI Jakarta"
	mapKotaCanonical["jakbar"] = "Jakarta Barat"
	mapKotaToProvinsi["jakbar"] = "DKI Jakarta"
	mapKotaCanonical["jakut"] = "Jakarta Utara"
	mapKotaToProvinsi["jakut"] = "DKI Jakarta"

	// DI Yogyakarta
	mapProvinsiCanonical["diy"] = "DI Yogyakarta"
	mapProvinsiCanonical["jogja"] = "DI Yogyakarta"
	mapProvinsiCanonical["yogyakarta"] = "DI Yogyakarta"
	mapKotaCanonical["jogja"] = "Yogyakarta"
	mapKotaToProvinsi["jogja"] = "DI Yogyakarta"

	// Singkatan populer
	mapProvinsiCanonical["jabar"] = "Jawa Barat"
	mapProvinsiCanonical["jateng"] = "Jawa Tengah"
	mapProvinsiCanonical["jatim"] = "Jawa Timur"
	mapProvinsiCanonical["sumut"] = "Sumatera Utara"
	mapProvinsiCanonical["sumbar"] = "Sumatera Barat"
	mapProvinsiCanonical["sumsel"] = "Sumatera Selatan"

	mapKotaCanonical["bdg"] = "Bandung"
	mapKotaToProvinsi["bdg"] = "Jawa Barat"
	mapKotaCanonical["bks"] = "Bekasi"
	mapKotaToProvinsi["bks"] = "Jawa Barat"
	mapKotaCanonical["sby"] = "Surabaya"
	mapKotaToProvinsi["sby"] = "Jawa Timur"
	mapKotaCanonical["smg"] = "Semarang"
	mapKotaToProvinsi["smg"] = "Jawa Tengah"
	mapKotaCanonical["slo"] = "Solo (Surakarta)"
	mapKotaToProvinsi["slo"] = "Jawa Tengah"
	mapKotaCanonical["solo"] = "Solo (Surakarta)"
	mapKotaToProvinsi["solo"] = "Jawa Tengah"
	mapKotaCanonical["surakarta"] = "Solo (Surakarta)"
	mapKotaToProvinsi["surakarta"] = "Jawa Tengah"
	mapKotaCanonical["tangsel"] = "Tangerang Selatan"
	mapKotaToProvinsi["tangsel"] = "Banten"
}

// ToTitleCase merapikan teks dengan awalan huruf kapital jika tidak ada di kamus
func ToTitleCase(input string) string {
	input = strings.TrimSpace(input)
	if input == "" {
		return ""
	}
	words := strings.Fields(input)
	for i, w := range words {
		r := []rune(w)
		if len(r) > 0 {
			r[0] = unicode.ToUpper(r[0])
			for j := 1; j < len(r); j++ {
				r[j] = unicode.ToLower(r[j])
			}
			words[i] = string(r)
		}
	}
	return strings.Join(words, " ")
}

// NormalizeWilayah menyeragamkan kota dan provinsi ke bentuk baku master data resmi.
// Mencegah duplikasi data akibat perbedaan huruf besar/kecil, awalan 'Kota'/'Kab.', atau singkatan.
func NormalizeWilayah(kotaInput, provInput string) (string, string) {
	kotaClean := cleanKey(kotaInput)
	provClean := cleanKey(provInput)

	var hasilKota string
	var hasilProv string

	// 1. Cari kecocokan baku untuk kota
	if canonicalKota, found := mapKotaCanonical[kotaClean]; found {
		hasilKota = canonicalKota
		// Jika provinsi tidak diisi atau tidak valid, otomatis ambil provinsi pasangannya
		if provClean == "" {
			hasilProv = mapKotaToProvinsi[kotaClean]
		}
	} else if canonicalKota, found := mapKotaCanonical[strings.ToLower(strings.TrimSpace(kotaInput))]; found {
		hasilKota = canonicalKota
		if provClean == "" {
			hasilProv = mapKotaToProvinsi[strings.ToLower(strings.TrimSpace(kotaInput))]
		}
	} else {
		hasilKota = ToTitleCase(kotaInput)
	}

	// 2. Cari kecocokan baku untuk provinsi
	if hasilProv == "" && provClean != "" {
		if canonicalProv, found := mapProvinsiCanonical[provClean]; found {
			hasilProv = canonicalProv
		} else if canonicalProv, found := mapProvinsiCanonical[strings.ToLower(strings.TrimSpace(provInput))]; found {
			hasilProv = canonicalProv
		} else {
			hasilProv = ToTitleCase(provInput)
		}
	}

	// 3. Jika provinsi masih kosong tetapi kota dikenali, pasangkan provinsi resminya
	if hasilProv == "" && hasilKota != "" {
		if matchedProv, found := mapKotaToProvinsi[cleanKey(hasilKota)]; found {
			hasilProv = matchedProv
		}
	}

	return hasilKota, hasilProv
}
