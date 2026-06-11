import { getLanguage } from '../i18n/index.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get auth headers with TMA initData.
 */
function getHeaders(rawInitData) {
  const lang = getLanguage();
  return {
    'Content-Type': 'application/json',
    ...(rawInitData ? { Authorization: `tma ${rawInitData}` } : {}),
    ...(lang ? { 'X-User-Language': lang } : {}),
  };
}

/**
 * Create a Stars invoice link for the given stadium and zone.
 * Returns { invoiceUrl, fee, stadium, zone }
 */
/**
 * Check if the user is a member of the SplitRide Telegram supergroup.
 */
export async function checkMembership(rawInitData) {
  const url = `${API_URL}/api/membership`;
  const res = await fetch(url, {
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const err = new Error(error.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = error;
    throw err;
  }

  return res.json();
}

/**
 * Fetch user membership & free ride availability.
 * Returns { member, joinLink, freeRideAvailable }
 */
export async function getUserStatus(rawInitData) {
  const url = `${API_URL}/api/user-status`;
  const res = await fetch(url, {
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const err = new Error(error.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = error;
    throw err;
  }

  return res.json();
}

/**
 * Create a Stars invoice link for the given stadium and zone.
 * Returns { invoiceUrl, fee, stadium, zone }
 */
export async function createInvoice(stadiumId, zoneId, rawInitData, customDestination = '') {
  const url = `${API_URL}/api/create-invoice`;
  console.log('[API] createInvoice →', url, { stadiumId, zoneId, hasAuth: !!rawInitData });

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(rawInitData),
    body: JSON.stringify({ stadiumId, zoneId, customDestination }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error('[API] createInvoice FAILED:', res.status, error);
    const err = new Error(error.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = error;
    throw err;
  }

  return res.json();
}

/**
 * Poll match status for the current user.
 * Returns { matched, timedOut, queuePosition, queueNeeded, topicLink?, ... }
 */
export async function getMatchStatus(stadiumId, zoneId, rawInitData) {
  const params = new URLSearchParams();
  if (stadiumId) params.set('stadiumId', stadiumId);
  if (zoneId) params.set('zoneId', zoneId);

  const res = await fetch(`${API_URL}/api/match-status?${params}`, {
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Cancel wait in queue and receive refund.
 */
export async function cancelRide(rawInitData) {
  const res = await fetch(`${API_URL}/api/cancel-ride`, {
    method: 'POST',
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch past ride history.
 */
export async function getRideHistory(rawInitData) {
  const url = `${API_URL}/api/ride-history`;
  console.log('[API] getRideHistory →', url, { hasAuth: !!rawInitData });

  const res = await fetch(url, {
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error('[API] getRideHistory FAILED:', res.status, error);
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch the user's active ride.
 * Returns { active, ride? }
 */
export async function getActiveRide(rawInitData) {
  const url = `${API_URL}/api/active-ride`;
  const res = await fetch(url, {
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Manually complete the active ride.
 */
export async function completeRide(rawInitData) {
  const url = `${API_URL}/api/complete-ride`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Request to match with 3 riders manual bypass.
 */
export async function matchThree(rawInitData) {
  const url = `${API_URL}/api/match-three`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}
