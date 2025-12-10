/**
 * Generate a consistent browser fingerprint
 * This creates a unique but stable ID for the same browser
 */
export const generateBrowserFingerprint = (tripId: string): string => {
  // Try to get existing fingerprint from localStorage first
  const storageKey = `browser_fingerprint_${tripId}`;
  const existing = localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  // Generate new fingerprint based on browser characteristics
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    tripId, // Include tripId to make it trip-specific
  ];

  // Simple hash function
  const hash = components.join('|');
  let fingerprint = '';

  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    fingerprint += char.toString(36);
  }

  // Take first 16 characters and add tripId prefix for uniqueness
  const fingerprintId = `${tripId}_${fingerprint.substring(0, 16)}`;

  // Save for future use
  localStorage.setItem(storageKey, fingerprintId);

  return fingerprintId;
};

/**
 * Get or generate user ID for a trip
 */
export const getOrCreateUserId = (tripId: string): string => {
  // First check localStorage
  const stored = localStorage.getItem(`user_id_${tripId}`);
  if (stored) {
    return stored;
  }

  // Generate based on browser fingerprint
  const fingerprintId = generateBrowserFingerprint(tripId);
  localStorage.setItem(`user_id_${tripId}`, fingerprintId);

  return fingerprintId;
};
