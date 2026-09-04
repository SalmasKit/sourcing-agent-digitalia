/**
 * Formats a Nominatim geocoding result into a clean City / Region / Country label
 * suitable for job location fields (avoiding raw street numbers / road-level clutter).
 */
export function formatLocationLabel(item) {
  if (!item) return '';
  const addr = item.address || {};

  const locality =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.state_district ||
    addr.county ||
    item.name;

  const region = addr.state || addr.region;
  const country = addr.country;

  const parts = [];
  if (locality) parts.push(locality);
  if (region && region !== locality) parts.push(region);
  if (country && country !== locality && country !== region) parts.push(country);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback if structured address fields are sparse
  return item.display_name
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !/^\d+$/.test(s))
    .slice(0, 3)
    .join(', ');
}

/**
 * Searches locations using OpenStreetMap Nominatim API, prioritizing administrative
 * areas and settlements, deduplicating results by formatted label.
 */
export async function searchLocations(query, lang = 'en') {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8`,
      { headers: { 'Accept-Language': lang || 'en' } }
    );
    if (!response.ok) return [];
    const data = await response.json();

    // Prioritize place and administrative boundary results over road/building-level matches
    const sorted = [...data].sort((a, b) => {
      const aIsPlace = a.class === 'place' || a.class === 'boundary';
      const bIsPlace = b.class === 'place' || b.class === 'boundary';
      if (aIsPlace && !bIsPlace) return -1;
      if (!aIsPlace && bIsPlace) return 1;
      return 0;
    });

    const seen = new Set();
    const results = [];

    for (const item of sorted) {
      const label = formatLocationLabel(item);
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        results.push({
          label,
          fullLabel: item.display_name,
        });
      }
      if (results.length >= 5) break;
    }

    return results;
  } catch {
    return [];
  }
}
