import 'dotenv/config';

// ─── Environment Variables ───────────────────────────────────────────────────
export const BOT_TOKEN = process.env.BOT_TOKEN;
export const WEBHOOK_URL = process.env.WEBHOOK_URL;
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'splitride-secret';
export const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_URL;
export const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;
export const DISPATCH_GROUP_ID = process.env.DISPATCH_GROUP_ID;
export const DISPATCH_GROUP_USERNAME = process.env.DISPATCH_GROUP_USERNAME;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const MATCH_FEE_STARS = parseInt(process.env.MATCH_FEE_STARS || '150', 10);
export const QUEUE_TIMEOUT_MS = parseInt(process.env.QUEUE_TIMEOUT_MS || '900000', 10);
export const BLACKLIST_TTL_SECONDS = parseInt(process.env.BLACKLIST_TTL_SECONDS || '259200', 10);
export const GROUP_SIZE = 4;

// ─── World Cup 2026 Stadiums ─────────────────────────────────────────────────
export const STADIUMS = [
  // ── USA (11 venues) ──────────────────────────────────────────────────────
  {
    id: 'metlife',
    name: 'MetLife Stadium',
    city: 'New York / New Jersey',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'manhattan', name: 'Manhattan' },
      { id: 'newark-airport', name: 'Newark Airport' },
      { id: 'jersey-city', name: 'Jersey City' },
      { id: 'times-square', name: 'Times Square' },
      { id: 'penn-station', name: 'Penn Station' },
    ],
  },
  {
    id: 'att',
    name: 'AT&T Stadium',
    city: 'Dallas',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-dallas', name: 'Downtown Dallas' },
      { id: 'dfw-airport', name: 'DFW Airport' },
      { id: 'fort-worth', name: 'Fort Worth' },
      { id: 'uptown-dallas', name: 'Uptown Dallas' },
      { id: 'dallas-love-field', name: 'Dallas Love Field' },
    ],
  },
  {
    id: 'sofi',
    name: 'SoFi Stadium',
    city: 'Los Angeles',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-la', name: 'Downtown LA' },
      { id: 'lax-airport', name: 'LAX Airport' },
      { id: 'hollywood', name: 'Hollywood' },
      { id: 'santa-monica', name: 'Santa Monica' },
      { id: 'union-station-la', name: 'Union Station' },
    ],
  },
  {
    id: 'hardrock',
    name: 'Hard Rock Stadium',
    city: 'Miami',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'miami-beach', name: 'Miami Beach' },
      { id: 'mia-airport', name: 'MIA Airport' },
      { id: 'downtown-miami', name: 'Downtown Miami' },
      { id: 'brickell', name: 'Brickell' },
      { id: 'fort-lauderdale', name: 'Fort Lauderdale' },
    ],
  },
  {
    id: 'lumen',
    name: 'Lumen Field',
    city: 'Seattle',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-seattle', name: 'Downtown Seattle' },
      { id: 'sea-airport', name: 'SEA Airport' },
      { id: 'capitol-hill', name: 'Capitol Hill' },
      { id: 'pike-place', name: 'Pike Place' },
      { id: 'bellevue', name: 'Bellevue' },
    ],
  },
  {
    id: 'gillette',
    name: 'Gillette Stadium',
    city: 'Boston',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-boston', name: 'Downtown Boston' },
      { id: 'logan-airport', name: 'Logan Airport' },
      { id: 'back-bay', name: 'Back Bay' },
      { id: 'cambridge', name: 'Cambridge' },
      { id: 'south-station', name: 'South Station' },
    ],
  },
  {
    id: 'mercedesbenz',
    name: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-atlanta', name: 'Downtown Atlanta' },
      { id: 'atl-airport', name: 'ATL Airport' },
      { id: 'midtown-atl', name: 'Midtown' },
      { id: 'buckhead', name: 'Buckhead' },
      { id: 'five-points', name: 'Five Points' },
    ],
  },
  {
    id: 'nrg',
    name: 'NRG Stadium',
    city: 'Houston',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-houston', name: 'Downtown Houston' },
      { id: 'iah-airport', name: 'IAH Airport' },
      { id: 'galleria', name: 'Galleria' },
      { id: 'medical-center', name: 'Medical Center' },
      { id: 'hobby-airport', name: 'Hobby Airport' },
    ],
  },
  {
    id: 'lincoln',
    name: 'Lincoln Financial Field',
    city: 'Philadelphia',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'center-city', name: 'Center City' },
      { id: 'phl-airport', name: 'PHL Airport' },
      { id: 'old-city', name: 'Old City' },
      { id: 'university-city', name: 'University City' },
      { id: '30th-st-station', name: '30th St Station' },
    ],
  },
  {
    id: 'arrowhead',
    name: 'GEHA Field at Arrowhead',
    city: 'Kansas City',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-kc', name: 'Downtown KC' },
      { id: 'kci-airport', name: 'KCI Airport' },
      { id: 'power-light', name: 'Power & Light' },
      { id: 'westport', name: 'Westport' },
      { id: 'union-station-kc', name: 'Union Station' },
    ],
  },
  {
    id: 'levis',
    name: "Levi's Stadium",
    city: 'San Francisco Bay',
    country: 'USA',
    emoji: '🇺🇸',
    zones: [
      { id: 'downtown-sj', name: 'Downtown San Jose' },
      { id: 'sfo-airport', name: 'SFO Airport' },
      { id: 'san-francisco', name: 'San Francisco' },
      { id: 'palo-alto', name: 'Palo Alto' },
      { id: 'caltrain-station', name: 'Caltrain Station' },
    ],
  },

  // ── Mexico (3 venues) ────────────────────────────────────────────────────
  {
    id: 'azteca',
    name: 'Estadio Azteca',
    city: 'Mexico City',
    country: 'Mexico',
    emoji: '🇲🇽',
    zones: [
      { id: 'centro-historico', name: 'Centro Histórico' },
      { id: 'mex-airport', name: 'MEX Airport' },
      { id: 'zona-rosa', name: 'Zona Rosa' },
      { id: 'coyoacan', name: 'Coyoacán' },
      { id: 'insurgentes', name: 'Insurgentes' },
    ],
  },
  {
    id: 'bbva',
    name: 'Estadio BBVA',
    city: 'Monterrey',
    country: 'Mexico',
    emoji: '🇲🇽',
    zones: [
      { id: 'centro-monterrey', name: 'Centro Monterrey' },
      { id: 'mty-airport', name: 'MTY Airport' },
      { id: 'san-pedro', name: 'San Pedro' },
      { id: 'barrio-antiguo', name: 'Barrio Antiguo' },
      { id: 'macroplaza', name: 'Macroplaza' },
    ],
  },
  {
    id: 'akron',
    name: 'Estadio Akron',
    city: 'Guadalajara',
    country: 'Mexico',
    emoji: '🇲🇽',
    zones: [
      { id: 'centro-guadalajara', name: 'Centro Guadalajara' },
      { id: 'gdl-airport', name: 'GDL Airport' },
      { id: 'zapopan', name: 'Zapopan' },
      { id: 'tlaquepaque', name: 'Tlaquepaque' },
      { id: 'chapultepec-gdl', name: 'Chapultepec' },
    ],
  },

  // ── Canada (2 venues) ────────────────────────────────────────────────────
  {
    id: 'bcplace',
    name: 'BC Place',
    city: 'Vancouver',
    country: 'Canada',
    emoji: '🇨🇦',
    zones: [
      { id: 'downtown-vancouver', name: 'Downtown Vancouver' },
      { id: 'yvr-airport', name: 'YVR Airport' },
      { id: 'gastown', name: 'Gastown' },
      { id: 'yaletown', name: 'Yaletown' },
      { id: 'waterfront-station', name: 'Waterfront Station' },
    ],
  },
  {
    id: 'bmo',
    name: 'BMO Field',
    city: 'Toronto',
    country: 'Canada',
    emoji: '🇨🇦',
    zones: [
      { id: 'downtown-toronto', name: 'Downtown Toronto' },
      { id: 'yyz-airport', name: 'YYZ Airport' },
      { id: 'entertainment-district', name: 'Entertainment District' },
      { id: 'liberty-village', name: 'Liberty Village' },
      { id: 'union-station-to', name: 'Union Station' },
    ],
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────
export function getStadium(stadiumId) {
  return STADIUMS.find((s) => s.id === stadiumId) || null;
}

export function getZone(stadiumId, zoneId) {
  const stadium = getStadium(stadiumId);
  if (!stadium) return null;
  return stadium.zones.find((z) => z.id === zoneId) || null;
}

export function getMatchKey(stadiumId, zoneId) {
  return `match:${stadiumId}:${zoneId}`;
}
