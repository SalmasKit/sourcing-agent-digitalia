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

  // Digitalia brand palette — muted corporate tones that match the app's design tokens
  const colors = [
    { bg: '#0E7C8C', text: '#ffffff' }, // Teal 600  (--dg-teal-600)
    { bg: '#0A5C68', text: '#ffffff' }, // Teal 700  (--dg-teal-700)
    { bg: '#278F5E', text: '#ffffff' }, // Green 600 (--dg-green-600)
    { bg: '#1F6E4A', text: '#ffffff' }, // Green 700 (--dg-green-700)
    { bg: '#B4650F', text: '#ffffff' }, // Bronze 600 (--dg-bronze-600)
    { bg: '#38414F', text: '#ffffff' }, // Ink 700   (--dg-ink-700)
  ];

  // Pick color deterministically based on candidate name
  const charSum = Math.abs(nameStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const { bg, text } = colors[charSum % colors.length];

  // rx="0" — the <img> element's CSS border-radius controls the shape in each component
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="0" fill="${bg}"/>
    <text x="60" y="60" font-family="'Space Grotesk', 'Inter', system-ui, sans-serif" font-size="46" font-weight="800" fill="${text}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
