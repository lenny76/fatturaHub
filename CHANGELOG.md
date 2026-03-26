# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e il progetto adotta il [Semantic Versioning](https://semver.org/lang/it/).

## [1.4.1] - 2026-03-26

### Aggiunto
- **Changelog in-app**: nuovo pulsante nella toolbar che apre un modale con la cronologia completa di tutte le versioni, con badge colorati per tipo di modifica.
- **Ricerca per importo**: digitando un valore numerico nella barra di ricerca (es. `1.234,56`) l'app filtra automaticamente su totale e imponibile. Supporta formato italiano e internazionale.
- **Colonna Imponibile**: la lista fatture mostra ora una colonna Imponibile accanto al Totale (visibile da desktop).

### Migliorato
- **Barra di ricerca**: placeholder e tooltip aggiornati per indicare tutti i criteri supportati (fornitore, n° fattura, importo).

---

## [1.4.0] - 2026-03-26

### Aggiunto
- **Legenda codici FatturaPA**: nuovo pulsante nella toolbar che apre un modale con la descrizione completa di tutti i codici TD (tipo documento), MP (modalità pagamento) e TP (condizioni pagamento), in tre colonne affiancate.
- **Ricerca per importo**: digitando un valore numerico nella barra di ricerca (es. `1.234,56`) l'app cerca automaticamente tra gli importi totale, imponibile e IVA di tutte le fatture. Supporta sia il formato italiano (`1.234,56`) che internazionale (`1234.56`).
- **Changelog in-app**: nuovo pulsante nella toolbar che mostra la cronologia degli aggiornamenti direttamente nell'app.

### Migliorato
- **Filtro tipo documento**: il menu a tendina mostra ora la descrizione del codice (es. `TD01 – Fattura`) invece del solo codice.
- **Sezione pagamenti** (modalità completa): tabella arricchita con colonna Condizioni (TP), colonna Modalità con descrizione (MP), colonna Pagamento (CodicePagamento) e riga Beneficiario.
- **Barra di ricerca**: placeholder e tooltip aggiornati per indicare tutti i criteri supportati.

---

## [1.3.3] - 2026-03-23

### Fix
- **Barra riepilogo importi non aggiornata con la ricerca**: gli importi di Imponibile, IVA e Totale in fondo alla lista fatture non si aggiornavano quando si effettuava una ricerca testuale — restavano sempre sul totale generale. Ora la barra riflette correttamente i risultati della ricerca attiva.
- **Formattazione importi senza separatore migliaia**: gli importi nella barra riepilogo (es. `3126,82 €`) non mostravano il punto delle migliaia. Ora vengono formattati correttamente (es. `3.126,82 €`).

---

## [1.3.2] - 2026-03-11

### Fix
- **Ricerca + filtro fornitore**: selezionare un fornitore dalla sidebar mentre era attiva una ricerca testuale non cambiava i risultati — il filtro fornitore veniva ignorato dal motore FTS5. Ora i due filtri si combinano correttamente.

---

## [1.3.1] - 2026-03-10

### Sicurezza
- **Rate limiting**: aggiunto limite di richieste su tutti gli endpoint API per prevenire attacchi DoS. Upload limitato a 60 richieste/minuto, comandi admin a 10/ora, restanti API a 500 ogni 15 minuti (`express-rate-limit`).

### Fix
- **Allineamento versione backend**: `backend/package.json` era rimasto alla versione precedente; ora allineato al numero di versione del progetto.

---

## [1.3.0] - 2026-03-09

### Aggiunto
- **Stampa fattura**: pulsante 🖨 nella toolbar del visualizzatore per stampare la fattura selezionata. Apre una finestra di stampa del browser con il contenuto della fattura (disponibile nelle modalità Semplificata e Completa).
- **Descrizione tipo documento**: il tipo di documento (es. TD01, TD27) viene ora visualizzato con la relativa descrizione italiana (es. `TD01 – Fattura`, `TD27 – Fattura per autoconsumo o cessioni gratuite senza rivalsa`).
- **Ricalcola importi**: nuova opzione nel menu impostazioni (⚙) che ricalcola gli importi di tutte le fatture già importate senza doverle re-importare. Utile dopo aggiornamenti che correggono il parsing degli importi.

### Fix
- **Importi zero non visualizzati (TD27 e simili)**: le fatture con importo pari a zero (tipicamente autoconsumo e cessioni gratuite) venivano salvate con importo vuoto e mostravano `—` nell'elenco invece di `€ 0,00`. Ora l'importo zero è correttamente riconosciuto e visualizzato.

---

## [1.2.6] - 2026-03-09

### Aggiunto
- **Stampa fattura**: pulsante 🖨 nella toolbar del visualizzatore per stampare la fattura selezionata. Apre una finestra di stampa del browser con il contenuto della fattura (disponibile nelle modalità Semplificata e Completa).
- **Descrizione tipo documento**: il tipo di documento (es. TD01, TD27) viene ora visualizzato con la relativa descrizione italiana (es. `TD01 – Fattura`, `TD27 – Fattura per autoconsumo o cessioni gratuite senza rivalsa`).
- **Ricalcola importi**: nuova opzione nel menu impostazioni (⚙) che ricalcola gli importi di tutte le fatture già importate senza doverle re-importare. Utile dopo aggiornamenti che correggono il parsing degli importi.

### Fix
- **Importi zero non visualizzati (TD27 e simili)**: le fatture con importo pari a zero (tipicamente autoconsumo e cessioni gratuite) venivano salvate con importo vuoto e mostravano `—` nell'elenco invece di `€ 0,00`. Ora l'importo zero è correttamente riconosciuto e visualizzato.

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
