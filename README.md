# FatturaHub

Gestore web di fatture elettroniche italiane (FatturaPA) — self-hosted, open source.

Importa l'intero archivio di fatture passive (XML e XML.p7m) ricevute via SDI: vengono indicizzate in un database locale e diventano immediatamente ricercabili dal browser, da qualsiasi dispositivo della rete. Niente Java, niente cartelle da condividere manualmente.

## Funzionalità

- **Importazione** di file XML e XML.p7m (firmati CAdES) — singoli o a cartelle intere
- **Ricerca full-text** su descrizioni, fornitore, cliente (FTS5)
- **Filtri** per anno, mese, tipo documento, fornitore
- **Visualizzazione** con foglio di stile XSLT ufficiale o renderer HTML integrato
- **Download** dei file originali
- **Dashboard** con totali per anno, top fornitori, importazioni recenti
- **Anti-duplicati** tramite hash SHA256
- **Solo fatture passive** (ricevute via SDI) — progettato per uso self-hosted locale

## Stack

| Layer | Tecnologia |
|-------|------------|
| Backend | Node.js 20 + Express 4 |
| Database | SQLite (better-sqlite3, sincrono) |
| Frontend | Vue 3 + Vite + Tailwind CSS + Pinia |
| Container | Docker + Docker Compose |

## Requisiti

- **Docker** (per l'avvio produzione, raccomandato) — oppure
- **Node.js ≥ 20** per lo sviluppo locale

## Avvio rapido

### Con Docker — un solo comando

```bash
docker compose up -d
```

App disponibile su: **http://localhost:5173**

I dati vengono salvati in `./data/` (volume montato).

### Sviluppo locale

```bash
npm run install:all   # installa dipendenze backend + frontend
npm run dev           # avvia backend + frontend (porta 5173)
```

## Foglio di stile XSLT

Per la visualizzazione ministeriale delle fatture, scaricare i fogli di stile ufficiali
dall'[Agenzia delle Entrate](https://www.fatturapa.gov.it) e posizionarli in `frontend/public/xslt/`:

| File | Formato |
|------|---------|
| `FatturaPA_v1.2.3.xsl` | Fatture PA (FPA12) |
| `FatturaOrdinaria_v1.2.3.xsl` | Fatture ordinarie (FPR12) |
| `FatturaSemplificata_v1.0.2.xsl` | Fatture semplificate (FSM10) |

Vedere `frontend/public/xslt/README.md` per dettagli.

Senza i file XSLT, viene usato automaticamente il renderer HTML integrato.

## Struttura dati

```
data/
├── db/
│   └── fatturahub.db       # Database SQLite
└── files/
    └── passiva/
        └── 2024/           # Fatture per anno
```

I file originali vengono conservati intatti; il database contiene solo metadati e XML indicizzato.

## Configurazione

Variabili d'ambiente (opzionali, hanno default funzionanti):

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `DB_PATH` | `data/db/fatturahub.db` | Percorso database SQLite |
| `FILES_PATH` | `data/files/` | Cartella file originali |
| `NODE_ENV` | `development` | Ambiente (`production` in Docker) |

## Licenza

[MIT](LICENSE) — © 2026 Lenny76
