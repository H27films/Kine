/**
 * Get a valid Strava access token, silently refreshing if expired.
 * Returns the access token string, or null if refresh fails.
 */
export async function getValidStravaToken(): Promise<string | null> {
  const token = localStorage.getItem('strava_access_token');
  const refreshToken = localStorage.getItem('strava_refresh_token');
  const expiresAt = localStorage.getItem('strava_expires_at');

  if (!token) return null;

  // If no expiry info, return the token as-is (can't check validity)
  if (!expiresAt || !refreshToken) return token;

  // Check if token is still valid (add 5-minute buffer)
  const now = Math.floor(Date.now() / 1000);
  if (now < Number(expiresAt) - 300) {
    return token;
  }

  // Token expired or about to expire — refresh via serverless API
  try {
    const response = await fetch('/api/strava-refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearStravaTokens();
      return null;
    }

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem('strava_access_token', data.access_token);
      localStorage.setItem('strava_refresh_token', data.refresh_token);
      localStorage.setItem('strava_expires_at', String(data.expires_at));
      return data.access_token;
    }

    clearStravaTokens();
    return null;
  } catch {
    clearStravaTokens();
    return null;
  }
}

/** Clear all stored Strava tokens so Connect recognizes a re-auth is needed. */
export function clearStravaTokens() {
  localStorage.removeItem('strava_access_token');
  localStorage.removeItem('strava_refresh_token');
  localStorage.removeItem('strava_expires_at');
}
