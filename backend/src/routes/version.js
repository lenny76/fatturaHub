const express = require('express');
const router = express.Router();
const { version: currentVersion } = require('../../package.json');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore

router.get('/', async (req, res) => {
  const now = Date.now();

  if (cache && now - cacheTime < CACHE_TTL) {
    return res.json(cache);
  }

  let latest = null;
  try {
    const response = await fetch('https://api.github.com/repos/lenny76/fatturaHub/releases/latest', {
      headers: { 'User-Agent': 'FatturaHub/' + currentVersion },
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const data = await response.json();
      latest = data.tag_name?.replace(/^v/, '') || null;
    }
  } catch {
    // GitHub non raggiungibile — ritorna solo versione corrente
  }

  const updateAvailable = latest ? compareVersions(latest, currentVersion) > 0 : false;

  cache = { current: currentVersion, latest, updateAvailable };
  cacheTime = now;

  res.json(cache);
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

module.exports = router;
