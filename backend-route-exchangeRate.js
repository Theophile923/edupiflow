/**
 * EduPiFlow — Exchange Rate Routes
 * BNR (National Bank of Rwanda) real-time exchange rate.
 *
 * IMPORTANT: For display and conversion purposes ONLY.
 * All actual payments are settled exclusively in Pi Coin.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const GCV_PI_TO_USD = 314159;
const MICRO_PI_PER_PI = 1000000;
const FALLBACK_RWF_PER_USD = parseFloat(process.env.BNR_FALLBACK_RWF_PER_USD) || 1300;
const CACHE_DURATION_MS = 60 * 60 * 1000;

let cachedRates = null;
let cacheTimestamp = 0;

async function fetchBnrRate() {
  try {
    const bnrUrl = process.env.BNR_API_URL || 'https://www.bnr.rw/api/exchange-rates';
    const response = await axios.get(bnrUrl, { timeout: 5000 });

    if (typeof response.data === 'number') return response.data;
    if (response.data.rate) return Number(response.data.rate);
    if (response.data.RWF_USD) return Number(response.data.RWF_USD);

    throw new Error('Unexpected BNR response format');
  } catch (error) {
    console.warn('[exchangeRate] BNR API unavailable, using fallback:', error.message);
    return FALLBACK_RWF_PER_USD;
  }
}

// GET /api/exchange-rate
router.get('/', async (req, res) => {
  const now = Date.now();

  if (cachedRates && now - cacheTimestamp < CACHE_DURATION_MS) {
    return res.json(cachedRates);
  }

  const rwfPerUsd = await fetchBnrRate();

  const rates = {
    RWF_PER_USD: rwfPerUsd,
    USD_PER_PI: GCV_PI_TO_USD,
    RWF_PER_PI: rwfPerUsd * GCV_PI_TO_USD,
    MICRO_PI_PER_USD: 1 / (GCV_PI_TO_USD / MICRO_PI_PER_PI),
    MICRO_PI_PER_RWF: 1 / ((GCV_PI_TO_USD / MICRO_PI_PER_PI) * rwfPerUsd),
    lastUpdated: new Date().toISOString(),
    source: 'BNR',
    note: 'For display purposes only. All payments are settled in Pi Coin.',
  };

  cachedRates = rates;
  cacheTimestamp = now;

  return res.json(rates);
});

// POST /api/exchange-rate/convert
router.post('/convert', async (req, res) => {
  const { amount, from, to } = req.body;

  if (!amount || !from || !to) {
    return res.status(400).json({ error: 'amount, from, and to are required.' });
  }

  const rates = cachedRates || await (async () => {
    const rwfPerUsd = await fetchBnrRate();
    return {
      RWF_PER_USD: rwfPerUsd,
      USD_PER_PI: GCV_PI_TO_USD,
      RWF_PER_PI: rwfPerUsd * GCV_PI_TO_USD,
    };
  })();

  let result;

  if (from === 'Pi' && to === 'RWF') result = amount * rates.RWF_PER_PI;
  else if (from === 'Pi' && to === 'USD') result = amount * GCV_PI_TO_USD;
  else if (from === 'RWF' && to === 'Pi') result = amount / rates.RWF_PER_PI;
  else if (from === 'USD' && to === 'Pi') result = amount / GCV_PI_TO_USD;
  else if (from === 'RWF' && to === 'USD') result = amount / rates.RWF_PER_USD;
  else if (from === 'USD' && to === 'RWF') result = amount * rates.RWF_PER_USD;
  else return res.status(400).json({ error: `Unsupported conversion: ${from} → ${to}` });

  return res.json({
    amount,
    from,
    to,
    result,
    rates,
    note: 'For display purposes only. All payments are settled in Pi Coin.',
  });
});

module.exports = router;
