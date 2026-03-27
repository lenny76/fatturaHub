export const CHANGELOG = [
  {
    version: '1.4.3',
    date: '2026-03-27',
    entries: [
      {
        type: 'fix',
        items: [
          'File p7m con chunk DER: corretta estrazione XML da firme con OCTET STRING segmentato (blocchi da 1000 byte)',
        ],
      },
    ],
  },
  {
    version: '1.4.2',
    date: '2026-03-27',
    entries: [
      {
        type: 'new',
        items: [
          'Visualizzazione DDT inline nella tabella righe: riga separatrice azzurra prima degli articoli collegati',
        ],
      },
      {
        type: 'improved',
        items: [
          'Guida in-app aggiornata con sezioni Legenda, Changelog e ricerca per importo',
          'Ricerca per importo: interi puri (es. 123) cercano come testo, servono i decimali per gli importi',
        ],
      },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-03-26',
    entries: [
      {
        type: 'new',
        items: [
          'Changelog in-app: modale con cronologia completa delle versioni',
          'Ricerca per importo: digita un numero per filtrare su totale e imponibile',
          'Colonna Imponibile nella lista fatture',
        ],
      },
      {
        type: 'improved',
        items: [
          'Barra di ricerca: placeholder e tooltip aggiornati',
        ],
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-03-26',
    entries: [
      {
        type: 'new',
        items: [
          'Legenda codici FatturaPA: modale con descrizione di tutti i codici TD, MP e TP in tre colonne',
          'Ricerca per importo: digitare un numero nella barra di ricerca filtra per totale, imponibile e IVA (formato italiano e internazionale)',
          'Changelog in-app: questo modale',
        ],
      },
      {
        type: 'improved',
        items: [
          'Filtro tipo documento: mostra la descrizione del codice (es. TD01 – Fattura)',
          'Sezione pagamenti (modalità completa): aggiunte colonne Condizioni, Modalità con descrizione, Pagamento e riga Beneficiario',
          'Barra di ricerca: placeholder e tooltip aggiornati',
        ],
      },
    ],
  },
  {
    version: '1.3.3',
    date: '2026-03-23',
    entries: [
      {
        type: 'fix',
        items: [
          'Barra riepilogo importi non aggiornata durante la ricerca testuale',
          'Importi nella barra riepilogo senza separatore delle migliaia',
        ],
      },
    ],
  },
  {
    version: '1.3.2',
    date: '2026-03-11',
    entries: [
      {
        type: 'fix',
        items: [
          'Ricerca testuale e filtro fornitore ora si combinano correttamente',
        ],
      },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-03-10',
    entries: [
      {
        type: 'security',
        items: [
          'Rate limiting su tutti gli endpoint API (upload 60/min, admin 10/ora, altri 500/15min)',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-09',
    entries: [
      {
        type: 'new',
        items: [
          'Stampa fattura: pulsante nella toolbar del visualizzatore',
          'Descrizione tipo documento TD con etichetta italiana',
          'Ricalcola importi: opzione nel menu impostazioni per ricalcolare gli importi senza re-importare',
        ],
      },
      {
        type: 'fix',
        items: [
          'Fatture con importo zero (TD27 e simili) ora visualizzate correttamente come € 0,00',
        ],
      },
    ],
  },
  {
    version: '1.2.4',
    date: '2026-03-04',
    entries: [
      {
        type: 'new',
        items: [
          'Barra di analisi importi sotto la lista: imponibile, IVA e totale aggiornati in base ai filtri attivi',
        ],
      },
      {
        type: 'fix',
        items: [
          'Ricerca fornitori nella sidebar ora funziona correttamente dopo selezione',
        ],
      },
    ],
  },
  {
    version: '1.2.2',
    date: '2026-03-04',
    entries: [
      {
        type: 'new',
        items: [
          'Guida integrata: pulsante ⓘ con panoramica di tutte le funzionalità',
        ],
      },
      {
        type: 'fix',
        items: [
          'Ordinamento lista fatture ora rispettato anche in modalità ricerca e filtro fornitore',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-04',
    entries: [
      {
        type: 'new',
        items: [
          'Dashboard: importazioni recenti, card anni, breadcrumb di navigazione',
          'Conferma eliminazione singola fattura con modale a due passi',
        ],
      },
      {
        type: 'improved',
        items: [
          'Dashboard: layout Top Fornitori rinnovato',
          'Toolbar: evidenziazione link attivo',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-03',
    entries: [
      {
        type: 'new',
        items: [
          'Notifiche di aggiornamento automatiche da GitHub',
          'Filtro per tipo documento nella toolbar',
          'Modalità ministeriale con XSL ufficiali Agenzia delle Entrate',
          'Dark mode Dashboard',
          'Visibilità anni: nascondi/mostra anni dalla toolbar',
          'Pulsante Reset Filtri',
          'Favicon SVG',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-03',
    entries: [
      {
        type: 'new',
        items: [
          'Importazione fatture XML e P7M (drag-and-drop, batch)',
          'Parsing FatturaPA con rilevamento duplicati via SHA256',
          'Ricerca full-text (FTS5) su fornitore, numero fattura, descrizioni',
          'Visualizzazione in 3 modalità: semplificata, completa, ministeriale',
          'Gestione allegati embedded: download e anteprima in-browser',
          'Filtri per anno, mese, tipo documento, fornitore',
          'Sidebar fornitori con conteggio fatture',
          'Dark mode',
          'Deploy via Docker Compose',
        ],
      },
    ],
  },
];
