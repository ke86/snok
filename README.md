# OneVR - Personal Overview Tool

Ett modulärt verktyg för att visa och filtrera personal på ett enkelt sätt.

## 📁 Filstruktur

```
onevr/
├── config.json          # All konfigurerbar data
├── modules/
│   ├── loader.js        # Entry point (laddar alla moduler)
│   ├── styles.js        # CSS styling (~7KB)
│   ├── utils.js         # Hjälpfunktioner (~3KB)
│   ├── scraper.js       # Scraping av personaldata (~5KB)
│   ├── ui.js            # UI-byggande (~5KB)
│   └── events.js        # Eventhantering (~10KB)
└── README.md
```

**Total storlek:** ~30KB (uppdelat i 6 mindre filer)
**Bookmarklet:** ~150 tecken

## 🚀 Installation

### 1. Ladda upp till GitHub

1. Skapa ett nytt repository (t.ex. `onevr`)
2. Ladda upp hela mappstrukturen ovan
3. Aktivera GitHub Pages: Settings → Pages → Source: main branch

### 2. Konfigurera loader

Öppna `modules/loader.js` och ändra rad 9:

```javascript
var BASE_URL = 'https://YOUR_USERNAME.github.io/YOUR_REPO';
```

Till din URL, t.ex.:
```javascript
var BASE_URL = 'https://johndoe.github.io/onevr';
```

### 3. Skapa bookmarklet

Skapa ett nytt bokmärke med denna URL:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='https://YOUR_USERNAME.github.io/YOUR_REPO/modules/loader.js?v='+Date.now();document.body.appendChild(s);})();
```

## 📝 Modulbeskrivningar

### `loader.js`
Entry point som laddar alla andra moduler i rätt ordning. Visar laddningsindikator under uppstart.

### `styles.js`
All CSS för overlays, kort, badges, knappar etc. Stödjer automatiskt dark mode.

### `utils.js`
Hjälpfunktioner:
- Regex-mönster för turnummer
- Datumhantering (parsing, formatering, navigation)
- TIL-tider och etiketter
- Laddningsindikatorer

### `scraper.js`
Skrapar personaldata från sidan:
- Extraherar namn, roll, turnummer, tider
- Bygger locationscache genom datumnavigering
- Beräknar statistik

### `ui.js`
Bygger UI-komponenter:
- Personkort med badges och taggar
- Filterknappar
- Sektioner och accordion
- Overlay-struktur

### `events.js`
Alla eventhanterare:
- Sök och filtrering
- Datumnavigering
- Klick på turnummer
- Ladda tider för personal utan tid
- Huvudinitiering (`OneVR.init()`)

## ⚙️ Konfiguration

Redigera `config.json` för att ändra:

| Sektion | Beskrivning |
|---------|-------------|
| `locations` | Ortmappning (kod → namn) |
| `roleBadges` | Roll → Badge-kod |
| `badgeColors` | Badge → Färgklass |
| `tilTimes` | Skifttider |
| `tilLabels` | Skiftetiketter |
| `roles` | Lista över roller att söka efter |
| `patterns` | Regex-mönster för turnummer |
| `ui` | UI-inställningar (delays, selektorer) |

## 🔧 Utveckling

### Lokal testning

1. Starta en lokal server:
   ```bash
   python -m http.server 8000
   ```

2. Ändra `BASE_URL` i loader.js till:
   ```javascript
   var BASE_URL = 'http://localhost:8000';
   ```

3. Öppna målsidan och kör bookmarkleten

### Lägga till nya funktioner

1. Skapa ny modul i `modules/`
2. Lägg till i `modules`-arrayen i `loader.js`
3. Exportera till `window.OneVR.dinmodul`

### Debugging

Alla moduler loggar till konsolen med prefix `[OneVR]`:
```
[OneVR] Styles loaded
[OneVR] Utils loaded
[OneVR] Scraper loaded
[OneVR] UI loaded
[OneVR] Events loaded
[OneVR] Ready!
[OneVR] Initialized with 42 people
```

## 📦 Uppdatera

1. Redigera relevant modul/config på GitHub
2. Commita ändringarna
3. Vänta ~1 minut för GitHub Pages att uppdateras
4. Kör bookmarkleten igen (cachebusting sköts automatiskt med `?v=timestamp`)

## 💡 Fördelar med modulär struktur

| Förut | Nu |
|-------|-----|
| 1 stor fil (~22KB) | 6 små filer (~3-10KB var) |
| Svårt att hitta kod | Logisk uppdelning |
| Allt måste laddas | Kan optimeras för parallel laddning |
| Svårt att testa | Varje modul kan testas separat |

## 📄 Licens

MIT
