/**
 * Option 1: Clean Corporate Initials Avatar Generator (Enterprise ATS Style)
 * Generates an SVG Data URI with candidate initials set in Digitalia's corporate brand palette.
 * If candidate manually uploaded an avatarUrl (e.g. custom upload), returns that URL.
 */
export const getAvatarUrl = (fullName, avatarUrl) => {
  // Only accept user-uploaded or valid external URLs that are NOT synthetic stock photos
  if (
    avatarUrl &&
    typeof avatarUrl === 'string' &&
    avatarUrl.trim().startsWith('http') &&
    !avatarUrl.includes('lego') &&
    !avatarUrl.includes('randomuser.me')
  ) {
    return avatarUrl.trim();
  }

  const nameStr = (fullName || 'Candidate').trim();
  const parts = nameStr.split(/\s+/).filter(Boolean);
  
  let initials = 'C';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  // Curated modern color pairs (background & text)
  const colors = [
    { bg: '#0284c7', text: '#ffffff' }, // Sky Blue
    { bg: '#4f46e5', text: '#ffffff' }, // Indigo
    { bg: '#0d9488', text: '#ffffff' }, // Teal
    { bg: '#2563eb', text: '#ffffff' }, // Royal Blue
    { bg: '#7c3aed', text: '#ffffff' }, // Violet
    { bg: '#0891b2', text: '#ffffff' }, // Cyan
  ];

  // Pick color deterministically based on candidate name
  const charSum = Math.abs(nameStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const { bg, text } = colors[charSum % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="28" fill="${bg}"/>
    <text x="60" y="65" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="${text}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
