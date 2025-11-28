const axios = require('axios');
const http = require('http');
const https = require('https');
const path = require('path');
// Load env from backend/.env and root/.env as fallback
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY;

// Agmarknet: Daily Arrival & Prices dataset resource id
// Reference: data.gov.in Agmarknet daily prices dataset
const DAILY_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';

const BASE_URL = 'https://api.data.gov.in/resource';

// Keep-alive agents to improve reliability and performance on repeated calls
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const client = axios.create({
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'FarmarMandiClient/1.0'
  }
});

// In-memory cache with TTL to reduce upstream calls and avoid timeouts under load
const cacheStore = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function buildCacheKey(prefix, params) {
  const ordered = Object.keys(params)
    .sort()
    .reduce((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {});
  return `${prefix}:${JSON.stringify(ordered)}`;
}

function getFromCache(key) {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return item.value;
}

function setToCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Basic retry with exponential backoff for transient failures/timeouts
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWithRetry(url, options = {}) {
  const maxAttempts = 3;
  const baseDelayMs = 800;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // 30s timeout per attempt to handle slow upstream
      const response = await client.get(url, { timeout: 30000, ...options });
      return response;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.toLowerCase?.().includes('timeout');
      const isTransient = isTimeout || (status >= 500 && status < 600) || status === 429;

      if (attempt === maxAttempts || !isTransient) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

function assertApiKey() {
  if (!DATA_GOV_API_KEY) {
    const error = new Error('Missing DATA_GOV_API_KEY');
    error.status = 500;
    throw error;
  }
}

function normalizeString(value) {
  return (value || '').toString().trim();
}

function toTitleCase(value) {
  const v = normalizeString(value).toLowerCase();
  return v.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildParams({ state, district, commodity, fromDate, toDate, limit = 1000, offset = 0 }) {
  const params = {
    'api-key': DATA_GOV_API_KEY,
    format: 'json',
    limit,
    offset
  };

  // Agmarknet supports filters like filters[field]=value
  const filters = {};
  if (state) filters.state = toTitleCase(state);
  if (district) filters.district = toTitleCase(district);
  if (commodity) filters.commodity = toTitleCase(commodity);

  Object.keys(filters).forEach((key) => {
    params[`filters[${key}]`] = filters[key];
  });

  if (fromDate) params.from_date = fromDate; // yyyy-mm-dd
  if (toDate) params.to_date = toDate; // yyyy-mm-dd

  return params;
}

async function fetchDailyPrices({ state, district, commodity, fromDate, toDate, limit = 500 }) {
  assertApiKey();

  // Basic validation
  // commodity can be optional for helper queries like unique districts

  const url = `${BASE_URL}/${DAILY_RESOURCE_ID}`;
  const params = buildParams({ state, district, commodity, fromDate, toDate, limit });

  // Serve from cache if available
  const cacheKey = buildCacheKey('daily', params);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await getWithRetry(url, { params });
    const records = response.data?.records || [];
    const normalized = records.map((r) => ({
      commodity: r.commodity,
      market: r.market || r.market_center || r.market_center_name,
      modal_price: Number(r.modal_price || r.modal || r.price || 0),
      min_price: Number(r.min_price || r.min_price_rs_quintal || 0),
      max_price: Number(r.max_price || r.max_price_rs_quintal || 0),
      arrival: Number(r.arrivals_in_qtl || r.arrival || 0),
      state: r.state,
      district: r.district,
      variety: r.variety || '',
      grade: r.grade || '',
      arrival_date: r.arrival_date || r.date || r.timestamp
    }));
    setToCache(cacheKey, normalized);
    return normalized;
  } catch (err) {
    const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.toLowerCase?.().includes('timeout');
    if (!isTimeout) throw err;
    // On timeout fallback to smaller limits progressively
    const fallbackLimits = [200, 100];
    for (const lim of fallbackLimits) {
      try {
        const smaller = { ...params, limit: lim };
        const response = await getWithRetry(url, { params: smaller });
        const records = response.data?.records || [];
        const normalized = records.map((r) => ({
          commodity: r.commodity,
          market: r.market || r.market_center || r.market_center_name,
          modal_price: Number(r.modal_price || r.modal || r.price || 0),
          min_price: Number(r.min_price || r.min_price_rs_quintal || 0),
          max_price: Number(r.max_price || r.max_price_rs_quintal || 0),
          arrival: Number(r.arrivals_in_qtl || r.arrival || 0),
          state: r.state,
          district: r.district,
          variety: r.variety || '',
          grade: r.grade || '',
          arrival_date: r.arrival_date || r.date || r.timestamp
        }));
        setToCache(cacheKey, normalized);
        return normalized;
      } catch (e) {
        const stillTimeout = e?.code === 'ECONNABORTED' || e?.message?.toLowerCase?.().includes('timeout');
        if (!stillTimeout) throw e;
      }
    }
    throw err;
  }
}

async function fetchLastNDays({ commodity, days = 30, state, district }) {
  const to = new Date();
  const from = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  const toDate = to.toISOString().slice(0, 10);
  const fromDate = from.toISOString().slice(0, 10);
  return fetchDailyPrices({ commodity, state, district, fromDate, toDate, limit: 1000 });
}

async function fetchDistrictsByState(state) {
  assertApiKey();
  if (!state) {
    const error = new Error('state is required');
    error.status = 400;
    throw error;
  }
  const url = `${BASE_URL}/${DAILY_RESOURCE_ID}`;
  // fetch many rows and dedupe locally
  const params = buildParams({ state, limit: 1000, offset: 0 });
  const cacheKey = buildCacheKey('districts', params);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;
  const response = await getWithRetry(url, { params });
  const records = response.data?.records || [];
  const normalizedState = toTitleCase(state);
  const set = new Set(
    records
      .filter(r => (r.state || '').trim() === normalizedState)
      .map(r => r.district)
      .filter(Boolean)
  );
  const list = Array.from(set).sort((a, b) => a.localeCompare(b));
  setToCache(cacheKey, list);
  return list;
}

module.exports = {
  fetchDailyPrices,
  fetchLastNDays,
  fetchDistrictsByState
};


