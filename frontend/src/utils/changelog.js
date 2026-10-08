export const CHANGELOG = [
  {
    version: '1.7.0',
    date: '2026-10-08',
    entries: [
      {
        type: 'new',
        items: [
          'Colonna Sconto nella vista Completa per sconti e maggiorazioni di riga',
        ],
      },
      {
        type: 'improved',
        items: [
          'Fornitori raggruppati per Partita IVA: niente più doppioni per ragioni sociali scritte in modo diverso',
          'Lista, sidebar fornitori e barra dei totali ora usano sempre gli stessi filtri',
          '"Ricalcola dati dalle fatture" rilegge tutti gli XML e aggiorna anagrafiche, importi e righe',
          'Database più compatto: il file di journal viene ridotto automaticamente',
          'Immagine Docker aggiornata a Node.js 22',
        ],
      },
      {
        type: 'fix',
        items: [
          'P.IVA, codici fiscali e numeri fattura non perdono più gli zeri iniziali (correzione automatica al primo avvio)',
          'Le note di credito ora vengono sottratte dai totali e mostrate in negativo',
          'Aliquota IVA 0% e importi a zero delle righe salvati correttamente',
          'Il filtro fornitore non include più fornitori con nome simile',
        ],
      },
      {
        type: 'security',
        items: [
          'I testi delle fatture non possono più eseguire codice nella pagina',
          'Le API non sono più accessibili da altri siti aperti nel browser',
          'Dipendenze aggiornate con correzioni di sicurezza (multer 2, better-sqlite3 12, Express)',
        ],
      },
    ],
  },
  {
    version: '1.6.2',
    date: '2026-05-29',
    entries: [
      {
        type: 'new',
        items: [
          'Dati di contratto, ordine, causale e altri documenti di riferimento ora mostrati nelle viste Semplificata e Completa',
          'Ricerca full-text estesa a numero contratto/ordine, CUP, CIG e causale (ricostruire l\'indice per le fatture già importate)',
        ],
      },
      {
        type: 'improved',
        items: [
          'Avanzamento in console durante "Ricostruisci indice ricerca" e "Ricalcola importi"',
        ],
      },
      {
        type: 'fix',
        items: [
          'Risolto il timeout su "Ricostruisci indice ricerca" e "Ricalcola importi" con archivi grandi',
        ],
      },
    ],
  },
  {
    version: '1.6.1',
    date: '2026-05-20',
    entries: [
      {
        type: 'fix',
        items: [
          'Modalità Ministeriale ora funziona anche in Docker (percorso XSL corretto in produzione)',
        ],
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-05-20',
    entries: [
      {
        type: 'new',
        items: [
          'Modalità Ministeriale: rendering della fattura con il foglio di stile ufficiale dell\'Agenzia delle Entrate',
        ],
      },
      {
        type: 'fix',
        items: [
          'Rendering XSLT ora funzionante (aggiornata libreria xslt-processor v3→v5)',
          'Errore 500 su fatture con doppio Processing Instruction in testa',
        ],
      },
    ],
  },
  {
    version: '1.5.1',
    date: '2026-03-30',
    entries: [
      {
        type: 'improved',
        items: [
          'DDT deduplicati: il banner appare solo una volta per gruppo, non ripetuto su ogni riga',
        ],
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-03-30',
    entries: [
      {
        type: 'new',
        items: [
          'AltriDatiGestionali nelle righe fattura: TARGA, KM e altri dati gestionali visibili sotto la descrizione',
        ],
      },
      {
        type: 'improved',
        items: [
          'Rate limit upload alzato da 60 a 200 req/min per importazioni massive',
        ],
      },
    ],
  },
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
