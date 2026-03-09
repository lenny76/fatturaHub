# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e il progetto adotta il [Semantic Versioning](https://semver.org/lang/it/).

## [Unreleased]

### Aggiunto
- **Stampa fattura**: pulsante 🖨 nella toolbar del visualizzatore per stampare la fattura selezionata. Apre una finestra di stampa del browser con il contenuto della fattura (disponibile nelle modalità Semplificata e Completa).

---

## [1.2.5] - 2026-03-04

### Modificato
- **Vista Ministeriale nascosta**: il pulsante "Ministeriale" non compare più nella toolbar del visualizzatore in attesa di un'implementazione completa e stabile.

---

## [1.2.4] - 2026-03-04

### Aggiunto
- **Barra di analisi importi**: sotto la lista fatture compare una riga con imponibile, IVA e totale complessivo. Si aggiorna automaticamente in base ai filtri attivi (anni, mesi, tipo documento, fornitore selezionato).

### Fix
- **Ricerca fornitori nella sidebar**: digitare un secondo termine di ricerca dopo aver selezionato un fornitore ora mostra correttamente tutti i fornitori disponibili, invece di restringere la ricerca a quello già selezionato.

---

## [1.2.2] - 2026-03-04

### Aggiunto
- **Guida integrata**: pulsante ⓘ nella toolbar apre un pannello con la panoramica di tutte le funzionalità dell'app (upload, ricerca, filtri, visualizzazione, allegati, fornitori, dashboard, impostazioni)

### Fix
- **Ordinamento lista fatture**: la selezione di data, fornitore, importo e numero fattura ora funziona correttamente anche in modalità ricerca e filtro fornitore (il parametro `sort`/`order` veniva ignorato dal backend in entrambi i rami di `search.js`)

---

## [1.2.1] - 2026-03-04

### Fix
- Docker: corretto il path di `package.json` in `version.js` (causava crash all'avvio del container)

---

## [1.2.0] - 2026-03-04

### Aggiunto
- Dashboard: pannello "Importazioni recenti" con fornitore e data delle ultime fatture importate
- Dashboard: card "Anni" nel riepilogo statistiche
- Dashboard: breadcrumb di navigazione con link diretto alle fatture
- Conferma eliminazione singola fattura con modale a due passi (dettaglio fattura → digitare "ELIMINA")

### Migliorato
- Dashboard: layout "Top fornitori" rinnovato con badge contatori e troncamento testo migliorato
- Toolbar: evidenziazione del link attivo (Dashboard / Fatture) con stile visivo dedicato

---

## [1.1.0] - 2026-03-03

### Aggiunto
- **Notifiche di aggiornamento**: l'app controlla automaticamente se è disponibile una nuova versione su GitHub e mostra un badge nella toolbar
- **Filtro per tipo documento**: selettore nella toolbar per filtrare le fatture per tipo (es. fattura, nota di credito, parcella)
- **Modalità ministeriale**: visualizzazione con i fogli di stile XSL ufficiali dell'Agenzia delle Entrate, renderizzati lato server
- **Dark mode Dashboard**: la vista statistiche supporta ora la modalità scura
- **Conferma reset dati**: il reset di tutti i dati richiede la digitazione di "ELIMINA" per confermare (protezione da eliminazioni accidentali)
- **Visibilità anni**: modale nelle impostazioni per nascondere/mostrare singoli anni dalla toolbar e dai risultati; preferenza salvata in `localStorage`
- **Pulsante Reset Filtri**: azzeramento rapido di tutti i filtri attivi dalla toolbar
- **Collegamento Dashboard**: accesso diretto alla dashboard tramite link nella toolbar principale
- **Favicon SVG**: nuova favicon scalabile in formato SVG per una migliore resa su tutti i dispositivi

### Migliorato
- Footer: mostra ora la versione corrente dell'applicazione accanto al copyright

---

## [1.0.0] - 2026-03-03

### Aggiunto
- Importazione fatture XML e P7M (singola e in blocco via drag-and-drop)
- Estrazione XML da CAdES `.p7m` in pure-JS (senza dipendenza da OpenSSL)
- Parsing FatturaPA con rilevamento duplicati via hash SHA256
- Ricerca full-text (FTS5) su fornitore, numero fattura, descrizioni
- Visualizzazione fatture in 3 modalità: semplificata, completa, ministeriale (XSLT)
- Rendering ministeriale server-side con i fogli XSL ufficiali dell'Agenzia delle Entrate
- Gestione allegati embedded (`<Allegati>`): download e anteprima in-browser
- Filtri per anno, mese, tipo documento, fornitore
- Sidebar fornitori con conteggio fatture
- Interfaccia dark mode
- Deploy via Docker Compose con volume persistente per i dati
- Porta applicazione unificata su 5173 (Express + Vite middleware in dev)
