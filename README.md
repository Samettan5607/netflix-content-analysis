# Netflix İçerik Analizi

Netflix katalog verilerini film ve dizi dağılımı, yapım ülkesi ve yayın yılı açısından inceleyen bir veri analizi projesi. Python betiği CSV özetleri ve PNG grafikler üretir. İnteraktif Türkçe panel, bu verileri grafikler ve filtrelenebilir bir içerik tablosuyla gösterir.

## Kurulum ve çalıştırma

Python 3.11 veya üzerini kullanın. Proje klasöründe şu komutları çalıştırın:

```bash
python -m venv .venv
```

Windows PowerShell'de `.\.venv\Scripts\Activate.ps1`, macOS ve Linux'ta `source .venv/bin/activate` komutuyla ortamı etkinleştirin.

```bash
python -m pip install -r requirements.txt
python app.py
```

Paneli [http://localhost:8000](http://localhost:8000) adresinde açabilirsiniz. Grafik ve CSV kütüphaneleri CDN üzerinden yüklendiği için panel internet bağlantısı gerektirir. Yalnızca analiz çıktılarını üretmek için `python netflix_analysis.py` komutunu çalıştırın.

## Veri kaynağı ve hesaplamalar

- İlk çalıştırmada `data/netflix_titles.csv` yoksa sabit rastgelelik tohumu ile 6.000 sentetik kayıt üretilir. Demo sonuçları Netflix kataloğunun gerçek istatistikleri olarak yorumlanamaz.
- Gerçek katalog verisiyle denemek için [Netflix Movies and TV Shows](https://www.kaggle.com/datasets/shivamb/netflix-shows) veri setini indirip `data/netflix_titles.csv` olarak kaydedin. Ardından `python netflix_analysis.py` komutuyla özetleri yeniden üretin.
- Ülke özetinde ortak yapımlar her yapım ülkesinde bir kez sayılır. Ülke sayıları izleyici tercihini veya her ülkede erişilebilir başlıkları ölçmez.
- Yıllık grafik, dosyadaki içerikleri `release_year` alanına göre gruplar. Platforma eklenme veya izlenme sayılarını ölçmez.

## Proje yapısı

| Dosya | Görevi |
| --- | --- |
| `app.py` | Paneli yerel HTTP sunucusunda açar ve analiz komutunu çalıştırır. |
| `netflix_analysis.py` | CSV'yi işler ve `output/` klasörüne iki CSV ile üç PNG yazar. |
| `index.html`, `style.css`, `dashboard.js` | Panel, grafikler ve arama filtreleri. |
| `requirements.txt` | Python bağımlılıkları. |
