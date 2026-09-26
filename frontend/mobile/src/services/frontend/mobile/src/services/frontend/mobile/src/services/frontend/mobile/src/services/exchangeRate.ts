/**
 * EduPiFlow — Exchange Rate Service
 *
 * IMPORTANT: This service is used ONLY for display and conversion purposes.
 * All actual payments are settled exclusively in Pi Coin.
 *
 * RWF (Rwandan Franc) rates are sourced from BNR (National Bank of Rwanda).
 * USD rates are fixed at the GCV standard (1 Pi = $314,159 USD).
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  GCV_PI_TO_USD,
  MICRO_PI_PER_PI,
  MICRO_PI_TO_USD,
} from './piConfig';

// ============================================
// TYPES
// ============================================
export interface ExchangeRates {
  RWF_PER_USD: number;
  USD_PER_PI: number;
  RWF_PER_PI: number;
  MICRO_PI_PER_USD: number;
  MICRO_PI_PER_RWF: number;
  lastUpdated: string;
  source: string;
}

// ============================================
// BNR FALLBACK (used if API unavailable)
// ============================================
const BNR_FALLBACK_RWF_PER_USD = 1300;

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

let cachedRates: ExchangeRates | null = null;
let cacheTimestamp = 0;

// ============================================
// FETCH BNR RATE
// ============================================

/**
 * Fetch the current RWF/USD exchange rate from BNR.
 * Falls back to a configured rate if the API is unavailable.
 *
 * @param bnrApiUrl - The BNR API URL (from environment)
 * @returns Promise resolving to the RWF/USD rate.
 */
export async function fetchBnrRate(bnrApiUrl: string): Promise<number> {
  try {
    const response = await fetch(bnrApiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`BNR API returned ${response.status}`);
    }

    const data = await response.json();

    // BNR API structure may vary — adjust as needed
    // Common fields: { rate: 1300, currency: "USD", ... }
    if (typeof data === 'number') return data;
    if (data.rate) return Number(data.rate);
    if (data.RWF_USD) return Number(data.RWF_USD);

    throw new Error('Unexpected BNR API response format');
  } catch (error) {
    console.warn(
      '[exchangeRate] BNR API unavailable, using fallback rate:',
      error
    );
    return BNR_FALLBACK_RWF_PER_USD;
  }
}

// ============================================
// GET ALL RATES (with caching)
// ============================================

/**
 * Get all exchange rates (RWF, USD, Pi).
 * Results are cached for 1 hour to avoid excessive API calls.
 *
 * @param bnrApiUrl - The BNR API URL
 * @returns Promise resolving to the exchange rates.
 */
export async function getExchangeRates(
  bnrApiUrl: string
): Promise<ExchangeRates> {
  const now = Date.now();

  if (cachedRates && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedRates;
  }

  const rwfPerUsd = await fetchBnrRate(bnrApiUrl);

  const rates: ExchangeRates = {
    RWF_PER_USD: rwfPerUsd,
    USD_PER_PI: GCV_PI_TO_USD,
    RWF_PER_PI: rwfPerUsd * GCV_PI_TO_USD,
    MICRO_PI_PER_USD: 1 / MICRO_PI_TO_USD,
    MICRO_PI_PER_RWF: 1 / (MICRO_PI_TO_USD * rwfPerUsd),
    lastUpdated: new Date().toISOString(),
    source: 'BNR',
  };

  cachedRates = rates;
  cacheTimestamp = now;

  return rates;
}

// ============================================
// CONVERSION HELPERS
// ============================================

/**
 * Convert RWF to Pi.
 * Example: 1000 RWF → Pi amount
 */
export async function rwfToPi(
  amountRwf: number,
  bnrApiUrl: string
): Promise<number> {
  const rates = await getExchangeRates(bnrApiUrl);
  return amountRwf / rates.RWF_PER_PI;
}

/**
 * Convert USD to Pi.
 */
export async function usdToPi(amountUsd: number): Promise<number> {
  return amountUsd / GCV_PI_TO_USD;
}

/**
 * Convert Pi to RWF.
 */
export async function piToRwf(
  amountPi: number,
  bnrApiUrl: string
): Promise<number> {
  const rates = await getExchangeRates(bnrApiUrl);
  return amountPi * rates.RWF_PER_PI;
}

/**
 * Convert Pi to USD.
 */
export function piToUsd(amountPi: number): number {
  return amountPi * GCV_PI_TO_USD;
}

/**
 * Convert Pi to Micro-Pi.
 */
export function piToMicroPi(amountPi: number): number {
  return amountPi * MICRO_PI_PER_PI;
}

/**
 * Convert Micro-Pi to Pi.
 */
export function microPiToPi(amountMicroPi: number): number {
  return amountMicroPi / MICRO_PI_PER_PI;
}

// ============================================
// DISPLAY FORMATTING
// ============================================

/**
 * Format an amount in Pi with appropriate precision.
 */
export function formatPi(amountPi: number): string {
  if (amountPi < 0.0001) {
    return `${piToMicroPi(amountPi).toFixed(2)} μπ`;
  }
  return `${amountPi.toFixed(8)} π`;
}

/**
 * Format an amount in RWF.
 */
export function formatRwf(amountRwf: number): string {
  return `${Math.round(amountRwf).toLocaleString('en-RW')} RWF`;
}

/**
 * Format an amount in USD.
 */
export function formatUsd(amountUsd: number): string {
  return `$${amountUsd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Display a payment amount in all three currencies.
 * Example: "0.00031800 π — 1,000 RWF — $100.00 USD"
 */
export async function formatAllCurrencies(
  amountPi: number,
  bnrApiUrl: string
): Promise<string> {
  const rwf = await piToRwf(amountPi, bnrApiUrl);
  const usd = piToUsd(amountPi);

  return `${formatPi(amountPi)} — ${formatRwf(rwf)} — ${formatUsd(usd)}`;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

export function clearRateCache(): void {
  cachedRates = null;
  cacheTimestamp = 0;
}
