# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e il progetto adotta il [Semantic Versioning](https://semver.org/lang/it/).

## [1.1.0] - 2026-03-04

### Aggiunto
- Impostazioni → "Visibilità anni": modale per nascondere/mostrare singoli anni dai filtri e dai risultati
- Gli anni nascosti vengono esclusi automaticamente da tutte le query API (toolbar e lista)
- Le nuove importazioni sono sempre visibili di default (solo gli anni esplicitamente nascosti vengono esclusi)
- Preferenza persistita in `localStorage` (`fh_hidden_years`)

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
