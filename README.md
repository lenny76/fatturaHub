# FatturaHub

Gestore web di fatture elettroniche italiane (FatturaPA) — self-hosted, open source.

Importa l'intero archivio di fatture passive (XML e XML.p7m) ricevute via SDI: vengono indicizzate in un database locale e diventano immediatamente ricercabili dal browser, da qualsiasi dispositivo della rete. Niente Java, niente cartelle da condividere manualmente.

## Funzionalità

- **Importazione** di file XML e XML.p7m (firmati CAdES) — singoli o a cartelle intere, con trascinamento
- **Ricerca full-text** su fornitore, P.IVA, numero fattura, descrizioni delle righe, causale e documenti di riferimento (contratto, ordine, CUP, CIG)
- **Ricerca per importo** — digitando un importo con decimali (es. `1.234,56`) trova le fatture con quel totale o imponibile
- **Filtri** per anno, mese, tipo documento e fornitore; gli anni non più rilevanti si possono nascondere
- **Fornitori raggruppati per Partita IVA** — nessun doppione quando la ragione sociale cambia tra una fattura e l'altra
- **Totali sempre coerenti** — imponibile, IVA e totale della selezione corrente, al netto delle note di credito
- **Tre modalità di visualizzazione**:
  - *Semplificata* — dati essenziali, righe e riepilogo IVA
  - *Completa* — con quantità, prezzi, sconti, DDT e pagamenti
  - *Ministeriale* — con il foglio di stile ufficiale dell'Agenzia delle Entrate
- **Stampa ed export PDF** della fattura visualizzata
- **Allegati** — visualizzazione e download degli allegati incorporati nelle fatture (PDF, immagini, XML, ecc.) con anteprima
- **Download** dei file originali e visualizzazione dell'XML grezzo
- **Legenda codici** FatturaPA (tipi documento, modalità e condizioni di pagamento)
- **Dashboard** con totali per anno, top fornitori, importazioni recenti
- **Anti-duplicati** tramite hash SHA256
- **Dark mode** — interfaccia chiara o scura con preferenza salvata automaticamente
- **Notifiche aggiornamenti** — controllo automatico della versione più recente disponibile su GitHub
- **Solo fatture passive** (ricevute via SDI) — progettato per uso self-hosted locale

## Stack

| Layer | Tecnologia |
|-------|------------|
| Backend | Node.js 22 + Express 4 |
| Database | SQLite (better-sqlite3, sincrono) con indice full-text FTS5 |
| Frontend | Vue 3 + Vite + Tailwind CSS + Pinia |
| Container | Docker + Docker Compose |

## Requisiti

- **Docker** (per l'avvio produzione, raccomandato) — oppure
- **Node.js ≥ 20** (consigliato 22) per lo sviluppo locale

## Avvio rapido

### Con Docker — un solo comando

```bash
docker compose up -d
```

App disponibile su: **http://localhost:5173**

Database e file originali vengono salvati nel volume Docker `fatturahub_data` (montato su `/app/data` nel container).

### Sviluppo locale

```bash
npm install && npm run install:all   # installa dipendenze root, backend e frontend
npm run dev                          # avvia il server unico (API + frontend con hot reload) sulla porta 5173
```

## Aggiornamento

```bash
git pull
docker compose up -d --build
```

Con Portainer, se lo stack è collegato al repository Git, basta **Pull and redeploy**.

Alcune versioni (ad esempio la 1.7.0) correggono il modo in cui i dati vengono letti dalle fatture: al primo avvio dopo l'aggiornamento tutte le fatture vengono ri-elaborate automaticamente dall'XML originale. L'operazione richiede circa 2 minuti ogni 8.000 fatture e durante l'elaborazione l'app non risponde; l'avanzamento è visibile nei log del container. **Prima di aggiornare è consigliato un backup del volume dati.**

## Foglio di stile XSLT

I fogli di stile ufficiali dell'[Agenzia delle Entrate](https://www.fatturapa.gov.it) per la visualizzazione ministeriale sono già inclusi in `frontend/public/xslt/`:

| File | Formato |
|------|---------|
| `FatturaPA_v1.2.3.xsl` | Fatture PA (FPA12) |
| `FatturaOrdinaria_v1.2.3.xsl` | Fatture ordinarie (FPR12) |
| `FatturaSemplificata_v1.0.2.xsl` | Fatture semplificate (FSM10) |

Per usare una versione più recente senza ricostruire l'immagine, copiare il file con lo stesso nome in `data/xslt/` (nel volume dati): ha la precedenza su quelli inclusi. Vedere `frontend/public/xslt/README.md` per dettagli.

## Struttura dati

```
data/
├── db/
│   └── fatturahub.db       # Database SQLite
├── files/
│   └── passiva/
│       └── 2024/           # Fatture originali per anno
└── xslt/                   # (opzionale) fogli di stile XSLT personalizzati
```

I file originali vengono conservati intatti; il database contiene i dati estratti e l'XML di ogni fattura, usato per la visualizzazione e per le ri-elaborazioni.

## Configurazione

Variabili d'ambiente (opzionali, hanno default funzionanti):

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `PORT` | `5173` | Porta del server |
| `DB_PATH` | `data/db/fatturahub.db` | Percorso database SQLite |
| `FILES_PATH` | `data/files/` | Cartella file originali |

Nell'immagine Docker `DB_PATH` e `FILES_PATH` puntano già a `/app/data`.

## Sicurezza

FatturaHub **non ha autenticazione**: è pensato per l'uso in una rete locale fidata. Non esporlo direttamente su Internet; se serve l'accesso da remoto, usare una VPN oppure un reverse proxy con autenticazione.

Le API accettano operazioni di modifica (upload, eliminazione) solo da pagine servite da FatturaHub stesso, per impedire che altri siti aperti nel browser agiscano sull'archivio. Dietro un reverse proxy, il proxy deve inoltrare l'header `Host` originale (o impostare `X-Forwarded-Host`): in caso contrario gli upload falliscono con l'errore *"Richiesta cross-origin non consentita"*.

## Licenza

[MIT](LICENSE) — © 2026 Lenny76
