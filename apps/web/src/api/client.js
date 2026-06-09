const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get auth headers with TMA initData.
 */
function getHeaders(rawInitData) {
  return {
    'Content-Type': 'application/json',
    ...(rawInitData ? { Authorization: `tma ${rawInitData}` } : {}),
  };
}

/**
 * Create a Stars invoice link for the given stadium and zone.
 * Returns { invoiceUrl, fee, stadium, zone }
 */
export async function createInvoice(stadiumId, zoneId, rawInitData, customDestination = '') {
  const res = await fetch(`${API_URL}/api/create-invoice`, {
    method: 'POST',
    headers: getHeaders(rawInitData),
    body: JSON.stringify({ stadiumId, zoneId, customDestination }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
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
  const res = await fetch(`${API_URL}/api/ride-history`, {
    headers: getHeaders(rawInitData),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}
