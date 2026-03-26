export const DOC_TYPES = {
  TD01: 'Fattura',
  TD02: 'Acconto/anticipo su fattura',
  TD03: 'Acconto/anticipo su parcella',
  TD04: 'Nota di credito',
  TD05: 'Nota di debito',
  TD06: 'Parcella',
  TD07: 'Fattura semplificata',
  TD08: 'Nota di credito semplificata',
  TD09: 'Nota di debito semplificata',
  TD16: 'Integrazione fattura reverse charge interno',
  TD17: 'Integrazione/autofattura acquisto servizi estero',
  TD18: 'Integrazione acquisto beni intracomunitari',
  TD19: 'Integrazione acquisto beni ex art.17 c.2 DPR 633/72',
  TD20: 'Autofattura per regolarizzazione e integrazione',
  TD21: 'Autofattura per splafonamento',
  TD22: 'Estrazione beni da deposito IVA',
  TD23: 'Estrazione beni da deposito IVA con versamento',
  TD24: 'Fattura differita art.21 c.4 lett.a DPR 633/72',
  TD25: 'Fattura differita art.21 c.4 terzo periodo DPR 633/72',
  TD26: 'Cessione beni ammortizzabili e passaggi interni',
  TD27: 'Fattura per autoconsumo o cessioni gratuite senza rivalsa',
  TD28: 'Acquisti da San Marino con IVA (carta di debito)',
};

export function docTypeLabel(code) {
  if (!code) return '';
  const desc = DOC_TYPES[code.toUpperCase()];
  return desc ? `${code} – ${desc}` : code;
}

export const PAYMENT_METHODS = {
  MP01: 'Contanti',
  MP02: 'Assegno',
  MP03: 'Assegno circolare',
  MP04: 'Contanti presso Tesoreria',
  MP05: 'Bonifico',
  MP06: 'Vaglia cambiario',
  MP07: 'Bollettino bancario',
  MP08: 'Carta di pagamento',
  MP09: 'RID',
  MP10: 'RID utenze',
  MP11: 'RID veloce',
  MP12: 'RIBA',
  MP13: 'MAV',
  MP14: 'Quietanza erario',
  MP15: 'Giroconto su conti di contabilità speciale',
  MP16: 'Domiciliazione bancaria',
  MP17: 'Domiciliazione postale',
  MP18: 'Bollettino di c/c postale',
  MP19: 'SEPA Direct Debit',
  MP20: 'SEPA Direct Debit CORE',
  MP21: 'SEPA Direct Debit B2B',
  MP22: 'Trattenuta su somme già riscosse',
  MP23: 'PagoPA',
};

export function paymentMethodLabel(code) {
  if (!code) return '';
  const desc = PAYMENT_METHODS[code.toUpperCase()];
  return desc ? `${code} – ${desc}` : code;
}

export const PAYMENT_CONDITIONS = {
  TP01: 'Pagamento a rate',
  TP02: 'Pagamento completo',
  TP03: 'Anticipo',
};

export function paymentConditionLabel(code) {
  if (!code) return '';
  const desc = PAYMENT_CONDITIONS[code.toUpperCase()];
  return desc ? `${code} – ${desc}` : code;
}
