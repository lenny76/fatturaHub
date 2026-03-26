<template>
  <div class="h-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900" @click="showSettings = false">

    <!-- ── Toolbar ── -->
    <header class="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
      <!-- Prima riga -->
      <div class="h-12 flex items-center gap-2 px-3">
        <RouterLink to="/" class="font-bold text-base tracking-tight text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FatturaHub</RouterLink>
        <a
          v-if="updateAvailable"
          :href="`https://github.com/lenny76/fatturaHub/releases/latest`"
          target="_blank"
          rel="noopener"
          class="ml-1 mr-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
          title="Nuova versione disponibile"
        >
          ↑ v{{ latestVersion }}
        </a>
        <span v-else class="mr-1" />

        <!-- Ricerca -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 gap-1">
          <span class="text-gray-400 text-xs">🔍</span>
          <input
            v-model="searchQ"
            @keyup.enter="doSearch"
            type="text"
            placeholder="Fornitore, n° fattura, importo…"
            title="Cerca per fornitore, P.IVA, numero fattura, descrizione righe o importo (es. 1.234,56)"
            class="bg-transparent text-gray-800 dark:text-white text-xs outline-none w-24 sm:w-36 md:w-44 placeholder-gray-400"
          />
          <button v-if="searchQ" @click="clearSearch" class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="flex-1" />

        <!-- Dashboard -->
        <RouterLink to="/dashboard" class="toolbar-btn" title="Dashboard statistiche">
          📊 <span class="ml-1 text-xs hidden sm:inline">Dashboard</span>
        </RouterLink>

        <!-- Carica -->
        <button @click="showUpload = true" class="toolbar-btn" title="Carica fatture">
          📂 <span class="ml-1 text-xs hidden sm:inline">Carica</span>
        </button>

        <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{{ store.total }} fatture</span>

        <!-- Toggle dark/light -->
        <button @click="toggleDark" class="toolbar-btn" :title="isDark ? 'Passa a tema chiaro' : 'Passa a tema scuro'">
          <!-- luna: sei in tema scuro -->
          <svg v-if="isDark" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          <!-- sole: sei in tema chiaro -->
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Legenda codici -->
        <button @click="showLegend = true" class="toolbar-btn" title="Legenda codici (TD, MP, TP)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h7"/>
          </svg>
        </button>

        <!-- Changelog -->
        <button @click="showChangelog = true" class="toolbar-btn" title="Novità e aggiornamenti">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </button>

        <!-- Guida -->
        <button @click="showHelp = true" class="toolbar-btn" title="Guida e funzionalità">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </button>

        <div class="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

        <!-- Impostazioni -->
        <div class="relative" @click.stop>
          <button
            @click="showSettings = !showSettings"
            class="toolbar-btn"
            :class="showSettings ? 'bg-gray-100 dark:bg-gray-600' : ''"
            title="Impostazioni"
          >
            ⚙️ <span class="ml-1 text-xs hidden sm:inline">Impostazioni</span>
          </button>
          <div
            v-if="showSettings"
            class="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          >
            <div class="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
              Impostazioni
            </div>
            <button
              @click="openYearSettings"
              class="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              📅 Visibilità anni
            </button>
            <button
              @click="rebuildFts"
              :disabled="rebuildingFts"
              class="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
              <span v-if="rebuildingFts">⏳ Ricostruzione...</span>
              <span v-else-if="rebuildFtsResult" :class="rebuildFtsResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ rebuildFtsResult.ok ? `✓ Indice ricostruito (${rebuildFtsResult.indexed} fatture)` : `✗ ${rebuildFtsResult.error}` }}
              </span>
              <span v-else>🔍 Ricostruisci indice ricerca</span>
            </button>
            <button
              @click="recalculateAmounts"
              :disabled="recalculating"
              class="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
              <span v-if="recalculating">⏳ Ricalcolo...</span>
              <span v-else-if="recalcResult" :class="recalcResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ recalcResult.ok ? `✓ Aggiornate ${recalcResult.updated} fatture` : `✗ ${recalcResult.error}` }}
              </span>
              <span v-else>💶 Ricalcola importi</span>
            </button>
            <div class="border-t border-gray-100 dark:border-gray-700 my-1" />
            <button
              @click="resetAllData"
              class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              🗑 Elimina tutti i dati
            </button>
          </div>
        </div>
      </div>

      <!-- Seconda riga: Filtri -->
      <div class="h-8 flex items-center gap-1 px-3 border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
        <!-- Anni -->
        <button
          @click="toggleYear(null)"
          class="filter-btn"
          :class="selectedYears.length === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          Tutti
        </button>
        <button
          v-for="y in visibleYears"
          :key="y"
          @click="toggleYear(y)"
          class="filter-btn"
          :class="selectedYears.includes(y) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          {{ y }}
        </button>

        <div class="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-2" />

        <!-- Mesi -->
        <button
          @click="toggleMonth(null)"
          class="filter-btn"
          :class="selectedMonths.length === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          Tutti
        </button>
        <button
          v-for="(m, idx) in months"
          :key="idx"
          @click="toggleMonth(idx + 1)"
          class="filter-btn"
          :class="selectedMonths.includes(idx + 1) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'"
        >
          {{ m }}
        </button>

        <template v-if="store.docTypes.length">
          <div class="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-2" />
          <!-- Tipo documento -->
          <select
            v-model="selectedDocType"
            @change="applyDocType"
            class="toolbar-select"
            title="Filtra per tipo documento"
          >
            <option value="">Tipo: tutti</option>
            <option v-for="dt in store.docTypes" :key="dt" :value="dt">{{ docTypeLabel(dt) }}</option>
          </select>
        </template>

        <!-- Reset filtri -->
        <button
          v-if="hasActiveFilters"
          @click="resetFilters"
          class="ml-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800 transition-colors whitespace-nowrap"
          title="Azzera tutti i filtri"
        >
          × Reset
        </button>
      </div>
    </header>

    <!-- ── Workspace ── -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <RouterView class="flex flex-1 min-h-0 overflow-hidden" />
    </div>

    <!-- ── Footer ── -->
    <footer class="flex-none h-6 flex items-center justify-center bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-300 select-none gap-2">
      <span>© 2026 Lenny76</span>
      <span>·</span>
      <a href="https://fatturahub.lenny76.com" target="_blank" rel="noopener" class="hover:text-gray-700 dark:hover:text-white transition-colors">fatturahub.lenny76.com</a>
      <template v-if="currentVersion">
        <span>·</span>
        <span>v{{ currentVersion }}</span>
      </template>
    </footer>

    <!-- ── Help / Guida modal ── -->
    <div v-if="showHelp" class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 pb-6 px-4" @click.self="showHelp = false">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-full overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-none">
          <div>
            <h2 class="text-sm font-semibold text-gray-800 dark:text-white">Guida a FatturaHub</h2>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Panoramica delle funzionalità disponibili</p>
          </div>
          <button @click="showHelp = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <!-- Body -->
        <div class="overflow-y-auto p-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <!-- Carica fatture -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">📂</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Carica fatture</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• Trascina una cartella o seleziona file singoli</li>
                <li>• Supporta <strong class="text-gray-700 dark:text-gray-300">.xml</strong> e <strong class="text-gray-700 dark:text-gray-300">.p7m</strong> (CAdES)</li>
                <li>• Upload in blocchi da 50 file con barra progresso</li>
                <li>• Deduplicazione automatica via hash SHA256</li>
              </ul>
            </div>

            <!-- Ricerca -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">🔍</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Ricerca</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• Ricerca full-text su descrizioni, fornitore e numero fattura</li>
                <li>• Motore FTS5 SQLite — ricerca istantanea su grandi archivi</li>
                <li>• Combinabile con filtri anno, mese e tipo documento</li>
                <li>• Click su un fornitore nella sidebar per filtrare</li>
              </ul>
            </div>

            <!-- Filtri -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">🗂</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Filtri</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• <strong class="text-gray-700 dark:text-gray-300">Anno</strong>: selezione multipla nella toolbar</li>
                <li>• <strong class="text-gray-700 dark:text-gray-300">Mese</strong>: selezione multipla (Gennaio–Dicembre)</li>
                <li>• <strong class="text-gray-700 dark:text-gray-300">Tipo documento</strong>: TD01, TD04, ecc.</li>
                <li>• Pulsante <em>× Reset</em> per azzerare tutti i filtri attivi</li>
                <li>• Filtri anno e mese persistiti in localStorage</li>
              </ul>
            </div>

            <!-- Visualizzazione fatture -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">📄</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Visualizzazione fatture</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• <strong class="text-gray-700 dark:text-gray-300">Semplificata</strong>: campi principali, leggibile</li>
                <li>• <strong class="text-gray-700 dark:text-gray-300">Completa</strong>: righe, prezzi, IVA e pagamenti</li>
                <li>• Visualizzatore XML raw con syntax highlighting</li>
              </ul>
            </div>

            <!-- Allegati -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">📎</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Allegati</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• Rileva allegati embedded nel file XML FatturaPA</li>
                <li>• Anteprima in-browser per PDF, immagini, XML, CSV, TXT</li>
                <li>• Download diretto per tutti i formati</li>
                <li>• Icona 📎 nell'elenco fatture quando presenti</li>
              </ul>
            </div>

            <!-- Pannello fornitori -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">🏢</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Pannello fornitori</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• Sidebar sinistra con tutti i fornitori e conteggio fatture</li>
                <li>• Click per filtrare l'elenco per fornitore</li>
                <li>• Si aggiorna automaticamente ai filtri attivi</li>
              </ul>
            </div>

            <!-- Dashboard -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">📊</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Dashboard</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• Totali imponibile, IVA e importo per anno</li>
                <li>• Top 10 fornitori per importo</li>
                <li>• Ultime importazioni</li>
                <li>• Riepilogo per tipo documento</li>
              </ul>
            </div>

            <!-- Impostazioni -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">⚙️</span>
                <span class="text-xs font-semibold text-gray-800 dark:text-white">Impostazioni</span>
              </div>
              <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• <strong class="text-gray-700 dark:text-gray-300">Visibilità anni</strong>: nasconde anni dalla toolbar e dai risultati</li>
                <li>• <strong class="text-gray-700 dark:text-gray-300">Tema</strong>: chiaro/scuro, persistito in localStorage</li>
                <li>• <strong class="text-gray-700 dark:text-gray-300">Ricostruisci indice ricerca</strong>: rigenera l'indice FTS5 da zero; utile se la ricerca testuale restituisce risultati mancanti o inconsistenti</li>
                <li>• <strong class="text-gray-700 dark:text-gray-300">Elimina tutti i dati</strong>: reset completo con doppia conferma</li>
              </ul>
            </div>

          </div>
        </div>
        <!-- Footer -->
        <div class="flex-none border-t border-gray-200 dark:border-gray-700 px-5 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
          FatturaHub gestisce esclusivamente <strong class="text-gray-500 dark:text-gray-400">fatture passive (ricevute)</strong> in formato FatturaPA.
        </div>
      </div>
    </div>

    <!-- ── Upload modal ── -->
    <UploadModal v-if="showUpload" @close="onUploadClose" />

    <!-- ── Year Visibility Modal ── -->
    <div v-if="showYearSettings" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" @click.self="showYearSettings = false">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-64">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-white">Visibilità anni</h2>
          <button @click="showYearSettings = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
          Gli anni nascosti sono esclusi dai filtri e dai risultati. Le nuove importazioni sono sempre visibili di default.
        </p>
        <div class="px-2 pb-3 space-y-0.5 max-h-64 overflow-y-auto">
          <div v-if="!store.years.length" class="text-xs text-gray-400 text-center py-4">Nessun anno disponibile</div>
          <div
            v-for="y in store.years"
            :key="y"
            class="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            @click="toggleYearVisibility(y)"
          >
            <span class="text-sm" :class="hiddenYears.includes(y) ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-white'">{{ y }}</span>
            <!-- Eye: visibile -->
            <svg v-if="!hiddenYears.includes(y)" class="w-4 h-4 text-blue-500 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <!-- Eye-off: nascosto -->
            <svg v-else class="w-4 h-4 text-gray-400 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Delete Confirm Modal ── -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" @click.self="cancelDelete">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80">

        <!-- Step 1: avviso -->
        <template v-if="deleteStep === 1">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-red-600 dark:text-red-400">Elimina tutti i dati</h2>
            <button @click="cancelDelete" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-4 py-4 space-y-2">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              Stai per eliminare <strong>tutte le fatture</strong> e i file associati. Questa operazione è <strong>irreversibile</strong>.
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Vuoi continuare?</p>
          </div>
          <div class="flex justify-end gap-2 px-4 pb-4">
            <button @click="cancelDelete" class="px-3 py-1.5 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Annulla</button>
            <button @click="confirmDeleteStep1" class="px-3 py-1.5 rounded text-xs bg-red-600 text-white hover:bg-red-700">Sì, continua</button>
          </div>
        </template>

        <!-- Step 2: verifica testuale -->
        <template v-else>
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-red-600 dark:text-red-400">Conferma finale</h2>
            <button @click="cancelDelete" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-4 py-4 space-y-3">
            <p class="text-xs text-gray-600 dark:text-gray-400">
              Digita <strong class="font-mono text-red-600 dark:text-red-400">ELIMINA</strong> per confermare:
            </p>
            <input
              v-model="deleteConfirmText"
              @keyup.enter="executeDeleteAll"
              type="text"
              placeholder="ELIMINA"
              autofocus
              class="w-full px-3 py-1.5 text-sm border rounded outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:border-red-500"
            />
          </div>
          <div class="flex justify-end gap-2 px-4 pb-4">
            <button @click="cancelDelete" class="px-3 py-1.5 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Annulla</button>
            <button
              @click="executeDeleteAll"
              :disabled="deleteConfirmText !== 'ELIMINA'"
              class="px-3 py-1.5 rounded text-xs text-white transition-colors"
              :class="deleteConfirmText === 'ELIMINA' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 dark:bg-red-900 cursor-not-allowed'"
            >Elimina tutto</button>
          </div>
        </template>

      </div>
    </div>
  </div>

  <!-- ── Legenda codici modal ── -->
  <div v-if="showLegend" class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 pb-6 px-4" @click.self="showLegend = false">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-none">
        <h2 class="text-sm font-semibold text-gray-800 dark:text-white">Legenda codici FatturaPA</h2>
        <button @click="showLegend = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="overflow-y-auto px-5 py-4 text-gray-700 dark:text-gray-300">
        <div class="grid grid-cols-3 gap-6">

          <!-- TD -->
          <div>
            <h3 class="font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Tipo documento (TD)</h3>
            <table class="w-full text-xs border-collapse">
              <tbody>
                <tr v-for="(desc, code) in DOC_TYPES" :key="code" class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-1 pr-3 font-mono font-medium text-gray-500 dark:text-gray-400 w-12 whitespace-nowrap">{{ code }}</td>
                  <td class="py-1">{{ desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MP -->
          <div>
            <h3 class="font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Modalità pagamento (MP)</h3>
            <table class="w-full text-xs border-collapse">
              <tbody>
                <tr v-for="(desc, code) in PAYMENT_METHODS" :key="code" class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-1 pr-3 font-mono font-medium text-gray-500 dark:text-gray-400 w-12 whitespace-nowrap">{{ code }}</td>
                  <td class="py-1">{{ desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- TP -->
          <div>
            <h3 class="font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Condizioni pagamento (TP)</h3>
            <table class="w-full text-xs border-collapse">
              <tbody>
                <tr v-for="(desc, code) in PAYMENT_CONDITIONS" :key="code" class="border-b border-gray-100 dark:border-gray-700">
                  <td class="py-1 pr-3 font-mono font-medium text-gray-500 dark:text-gray-400 w-12 whitespace-nowrap">{{ code }}</td>
                  <td class="py-1">{{ desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- ── Changelog modal ── -->
  <div v-if="showChangelog" class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-6 pb-6 px-4" @click.self="showChangelog = false">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl flex flex-col max-h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-none">
        <div>
          <h2 class="text-sm font-semibold text-gray-800 dark:text-white">Novità e aggiornamenti</h2>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Cronologia delle versioni</p>
        </div>
        <button @click="showChangelog = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="overflow-y-auto px-5 py-4 space-y-5">
        <div v-for="release in CHANGELOG" :key="release.version">
          <div class="flex items-baseline gap-2 mb-2">
            <span class="font-mono font-semibold text-sm text-gray-800 dark:text-white">v{{ release.version }}</span>
            <span class="text-xs text-gray-400 dark:text-gray-500">{{ release.date }}</span>
          </div>
          <div v-for="group in release.entries" :key="group.type" class="mb-2">
            <span
              class="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded mb-1"
              :class="{
                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': group.type === 'new',
                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300': group.type === 'improved',
                'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300': group.type === 'fix',
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300': group.type === 'security',
              }"
            >{{ group.type === 'new' ? 'Novità' : group.type === 'improved' ? 'Migliorato' : group.type === 'fix' ? 'Fix' : 'Sicurezza' }}</span>
            <ul class="space-y-0.5">
              <li v-for="item in group.items" :key="item" class="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5">
                <span class="text-gray-400 flex-none">•</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
          <div class="border-b border-gray-100 dark:border-gray-700 mt-3" />
        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useInvoicesStore } from '@/stores/invoices';
import UploadModal from '@/components/UploadModal.vue';
import api from '@/api';
import { docTypeLabel, DOC_TYPES, PAYMENT_METHODS, PAYMENT_CONDITIONS } from '@/utils/docTypes';
import { CHANGELOG } from '@/utils/changelog';

const store = useInvoicesStore();
const showUpload = ref(false);
const showHelp = ref(false);
const showLegend = ref(false);
const showChangelog = ref(false);
const showSettings = ref(false);
const showYearSettings = ref(false);
const showDeleteConfirm = ref(false);
const deleteStep = ref(1);
const deleteConfirmText = ref('');
const isDark = ref(false);
const updateAvailable = ref(false);
const latestVersion = ref('');
const currentVersion = ref('');
const rebuildingFts = ref(false);
const rebuildFtsResult = ref(null);
const recalculating = ref(false);
const recalcResult = ref(null);

function toggleDark() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}
const hiddenYears = ref([]);
const selectedYears = ref([]);
const selectedMonths = ref([]);
const selectedDocType = ref('');
const searchQ = ref('');

const visibleYears = computed(() => store.years.filter(y => !hiddenYears.value.includes(y)));

const effectiveYears = computed(() => {
  const selected = selectedYears.value.filter(y => !hiddenYears.value.includes(y));
  if (selected.length > 0) return selected;
  if (hiddenYears.value.length > 0) return visibleYears.value;
  return [];
});

const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const hasActiveFilters = computed(() => selectedYears.value.length > 0 || selectedMonths.value.length > 0 || !!selectedDocType.value);

function saveFilters() {
  localStorage.setItem('fh_years', JSON.stringify(selectedYears.value));
  localStorage.setItem('fh_months', JSON.stringify(selectedMonths.value));
}

function openYearSettings() {
  showSettings.value = false;
  showYearSettings.value = true;
}

function toggleYearVisibility(year) {
  if (hiddenYears.value.includes(year)) {
    hiddenYears.value = hiddenYears.value.filter(y => y !== year);
  } else {
    hiddenYears.value = [...hiddenYears.value, year];
    selectedYears.value = selectedYears.value.filter(y => y !== year);
  }
  localStorage.setItem('fh_hidden_years', JSON.stringify(hiddenYears.value));
  applyFilters();
}

function toggleYear(year) {
  if (year === null) {
    selectedYears.value = [];
  } else {
    const idx = selectedYears.value.indexOf(year);
    if (idx === -1) {
      selectedYears.value = [...selectedYears.value, year];
    } else {
      selectedYears.value = selectedYears.value.filter(y => y !== year);
    }
  }
  applyFilters();
}

function toggleMonth(month) {
  if (month === null) {
    selectedMonths.value = [];
  } else {
    const idx = selectedMonths.value.indexOf(month);
    if (idx === -1) {
      selectedMonths.value = [...selectedMonths.value, month];
    } else {
      selectedMonths.value = selectedMonths.value.filter(m => m !== month);
    }
  }
  applyFilters();
}

function applyFilters() {
  store.setFilter('years', effectiveYears.value.join(','));
  store.setFilter('months', selectedMonths.value.join(','));
  saveFilters();
  store.fetchList();
}

function applyDocType() {
  store.setFilter('docType', selectedDocType.value);
  store.fetchList();
}

function resetFilters() {
  selectedYears.value = [];
  selectedMonths.value = [];
  selectedDocType.value = '';
  searchQ.value = '';
  store.setFilter('docType', '');
  store.setFilter('q', '');
  store.setFilter('amount', '');
  applyFilters(); // usa effectiveYears per rispettare gli anni nascosti
}

onMounted(async () => {
  const saved = localStorage.getItem('theme');
  isDark.value = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark.value);

  // Ripristina anni nascosti
  try {
    const savedHidden = localStorage.getItem('fh_hidden_years');
    if (savedHidden) hiddenYears.value = JSON.parse(savedHidden);
  } catch {}

  // Ripristina filtri salvati
  try {
    const savedYears = localStorage.getItem('fh_years');
    const savedMonths = localStorage.getItem('fh_months');
    if (savedYears) selectedYears.value = JSON.parse(savedYears);
    if (savedMonths) selectedMonths.value = JSON.parse(savedMonths);
  } catch {}

  await store.fetchStats();
  applyFilters(); // effectiveYears è ora calcolabile con store.years popolato

  try {
    const { data } = await api.get('/version');
    currentVersion.value = data.current;
    if (data.updateAvailable) {
      updateAvailable.value = true;
      latestVersion.value = data.latest;
    }
  } catch {
    // versione check non critico
  }
});

async function onUploadClose() {
  showUpload.value = false;
  await store.fetchStats();
  applyFilters(); // ricalcola effectiveYears (nuovi anni sono visibili di default)
}

function parseAmountQuery(str) {
  const s = str.trim().replace(/\s/g, '');
  if (!/^[\d.,]+$/.test(s) || s === '') return null;
  let normalized = s;
  if (s.includes('.') && s.includes(',')) {
    // Entrambi i separatori: l'ultimo è il decimale
    normalized = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    normalized = s.replace(',', '.');
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

function doSearch() {
  const amount = parseAmountQuery(searchQ.value);
  if (amount !== null) {
    store.setFilter('q', '');
    store.setFilter('amount', String(amount));
  } else {
    store.setFilter('amount', '');
    store.setFilter('q', searchQ.value);
  }
  store.fetchList();
}

function clearSearch() {
  searchQ.value = '';
  store.setFilter('q', '');
  store.setFilter('amount', '');
  store.fetchList();
}

async function recalculateAmounts() {
  recalculating.value = true;
  recalcResult.value = null;
  try {
    const { data } = await api.post('/admin/recalculate-amounts');
    recalcResult.value = { ok: true, updated: data.updated };
    applyFilters();
  } catch (err) {
    recalcResult.value = { ok: false, error: err.response?.data?.error || err.message };
  } finally {
    recalculating.value = false;
    setTimeout(() => { recalcResult.value = null; }, 5000);
  }
}

async function rebuildFts() {
  rebuildingFts.value = true;
  rebuildFtsResult.value = null;
  try {
    const { data } = await api.post('/admin/rebuild-fts');
    rebuildFtsResult.value = { ok: true, indexed: data.indexed };
  } catch (err) {
    rebuildFtsResult.value = { ok: false, error: err.response?.data?.error || err.message };
  } finally {
    rebuildingFts.value = false;
    setTimeout(() => { rebuildFtsResult.value = null; }, 5000);
  }
}

function resetAllData() {
  showSettings.value = false;
  deleteStep.value = 1;
  deleteConfirmText.value = '';
  showDeleteConfirm.value = true;
}

function cancelDelete() {
  showDeleteConfirm.value = false;
  deleteConfirmText.value = '';
}

function confirmDeleteStep1() {
  deleteStep.value = 2;
  deleteConfirmText.value = '';
}

async function executeDeleteAll() {
  if (deleteConfirmText.value !== 'ELIMINA') return;
  try {
    await api.delete('/admin/reset');
    showDeleteConfirm.value = false;
    store.resetFilters();
    selectedYears.value = [];
    selectedMonths.value = [];
    selectedDocType.value = '';
    searchQ.value = '';
    saveFilters();
    await Promise.all([store.fetchStats(), store.fetchList()]);
  } catch (e) {
    alert('Errore: ' + (e.response?.data?.error || e.message));
  }
}
</script>

<style>
.toolbar-btn {
  @apply flex items-center px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer;
}
a.toolbar-btn.router-link-active {
  @apply bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400;
}
.toolbar-select {
  @apply bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded px-2 py-1 outline-none focus:border-blue-500;
}
.filter-btn {
  @apply px-2 py-0.5 rounded text-xs transition-colors cursor-pointer whitespace-nowrap;
}
</style>
