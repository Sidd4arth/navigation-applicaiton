// ─── Design Tokens ────────────────────────────────────────────────────────────

export const COLORS = {
  bg:         '#000000',
  bgCard:     '#111111',
  bgGlass:    '#111111',
  border:     '#333333',
  borderMid:  '#444444',
  text:       '#ffffff',
  textMuted:  '#999999',
  textFaint:  '#666666',
  safe:       '#22C55E',
  moderate:   '#EAB308',
  unsafe:     '#F97316',
  danger:     '#EF4444',
  blue:       '#ffffff', // Monochrome blue replacement
  indigo:     '#e0e0e0', // Monochrome indigo replacement
  purple:     '#cccccc', // Monochrome purple replacement
};

export const ZONE_COLORS = {
  CRIME_HOTSPOT: '#EF4444',
  HARASSMENT:    '#F97316',
  THEFT:         '#F59E0B',
  POOR_LIGHTING: '#EAB308',
  UNSAFE_ROAD:   '#F97316',
  ISOLATED:      '#6B7280',
};

// ─── Static Mock Data ─────────────────────────────────────────────────────────

export const REPORT_CATEGORIES = [
  { value: 'HARASSMENT',          label: 'Harassment',          icon: '⚠️' },
  { value: 'THEFT',               label: 'Theft / Robbery',     icon: '💰' },
  { value: 'POOR_LIGHTING',       label: 'Poor Lighting',       icon: '💡' },
  { value: 'UNSAFE_ROAD',         label: 'Unsafe Road',         icon: '🚧' },
  { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity', icon: '👁️' },
  { value: 'OTHER',               label: 'Other',               icon: '❓' },
];

export const STATIC_USER = {
  id:         '2b097945-e3f7-41d6-aa7f-d45230e1dfd3',
  name:       'Priya Sharma',
  email:      'priya@example.com',
  phone:      '9876543210',
  createdAt:  '2026-01-15T10:00:00Z',
  lastActive: new Date().toISOString(),
};

export const STATIC_ZONES = [
  { id:'z1', type:'CRIME_HOTSPOT', severity:0.90, lat:22.7230, lng:75.8640, radiusMeters:250, label:'High Theft Zone',         description:'42 reported incidents in last 30 days',         reportCount:42 },
  { id:'z2', type:'POOR_LIGHTING', severity:0.65, lat:22.7180, lng:75.8780, radiusMeters:150, label:'Dark Street',             description:'No working street lights after 8 PM',            reportCount:18 },
  { id:'z3', type:'HARASSMENT',    severity:0.75, lat:22.7310, lng:75.8550, radiusMeters:200, label:'Harassment Reported',     description:'Multiple verbal harassment incidents reported',   reportCount:27 },
  { id:'z4', type:'UNSAFE_ROAD',   severity:0.50, lat:22.7090, lng:75.8700, radiusMeters:180, label:'Unsafe Road Condition',   description:'Poor road quality, no footpath or street light', reportCount:12 },
  { id:'z5', type:'ISOLATED',      severity:0.45, lat:22.7260, lng:75.8450, radiusMeters:300, label:'Isolated Area',           description:'Low foot traffic, no shops nearby at night',     reportCount:8  },
  { id:'z6', type:'THEFT',         severity:0.70, lat:22.7150, lng:75.8610, radiusMeters:120, label:'Chain Snatching Spot',    description:'3 chain snatching cases in 2 weeks',             reportCount:15 },
];

export const STATIC_REPORTS = [
  { id:'r1', category:'HARASSMENT',          description:'Verbal harassment near bus stand by a group of men', lat:22.7196, lng:75.8577, status:'VERIFIED', occurredAt:'2026-05-10T20:30:00Z', createdAt:'2026-05-10T21:00:00Z' },
  { id:'r2', category:'THEFT',               description:'Chain snatching incident near market',               lat:22.7241, lng:75.8652, status:'PENDING',  occurredAt:'2026-05-12T19:00:00Z', createdAt:'2026-05-12T19:30:00Z' },
  { id:'r3', category:'POOR_LIGHTING',       description:'Street lights not working on this stretch for weeks', lat:22.7180, lng:75.8620, status:'VERIFIED', occurredAt:'2026-05-08T22:00:00Z', createdAt:'2026-05-08T22:15:00Z' },
  { id:'r4', category:'SUSPICIOUS_ACTIVITY', description:'Unknown people lurking near the park late night',    lat:22.7300, lng:75.8590, status:'PENDING',  occurredAt:'2026-05-13T23:00:00Z', createdAt:'2026-05-13T23:20:00Z' },
];

export const STATIC_CONTACTS = [
  { id:'c1', name:'Mom',   phone:'9876543210', email:'mom@example.com', relationship:'Mother', isPrimary:true,  createdAt:'2026-01-15T10:00:00Z' },
  { id:'c2', name:'Rahul', phone:'9123456789', email:null,              relationship:'Brother',isPrimary:false, createdAt:'2026-02-01T10:00:00Z' },
];

export const STATIC_ROUTE_HISTORY = [
  { id:'rh1', originAddress:'Rajwada',     destAddress:'Central Mall', safetyScore:0.87, travelMode:'WALKING', createdAt:'2026-05-13T18:00:00Z' },
  { id:'rh2', originAddress:'Vijay Nagar', destAddress:'GPO',          safetyScore:0.52, travelMode:'DRIVING', createdAt:'2026-05-12T09:00:00Z' },
  { id:'rh3', originAddress:'Palasia',     destAddress:'Airport',      safetyScore:0.78, travelMode:'TRANSIT', createdAt:'2026-05-11T14:30:00Z' },
];

export const STATIC_SAFETY_SCORE = {
  safetyScore: 0.72,
  safetyLabel: 'MODERATE',
  safetyColor: '#EAB308',
  breakdown: {
    incidentScore:      1.0,
    lightingScore:      0.75,
    weatherScore:       0.85,
    timeScore:          1.0,
    incidentCount:      0,
    streetLampCount:    3,
    cctvCount:          1,
    policeStationCount: 0,
    weatherCondition:   'Haze',
    timeOfDay:          'DAY',
  },
  warnings: ['Limited street lighting in this area'],
};

export const STATIC_ANALYZED_ROUTES = [
  {
    routeId:'ro1', rank:1, recommended:true,  safetyScore:0.87, safetyLabel:'SAFE',   safetyColor:'#22C55E',
    duration:{ text:'24 min' }, distance:{ text:'2.3 km' },
    warnings:['Route passes through 1 flagged zone'],
    dangerZones:[STATIC_ZONES[1]],
  },
  {
    routeId:'ro2', rank:2, recommended:false, safetyScore:0.52, safetyLabel:'UNSAFE', safetyColor:'#F97316',
    duration:{ text:'20 min' }, distance:{ text:'2.1 km' },
    warnings:['Night risk elevated', 'Passes through 3 danger zones'],
    dangerZones:[STATIC_ZONES[0], STATIC_ZONES[2]],
  },
  {
    routeId:'ro3', rank:3, recommended:false, safetyScore:0.38, safetyLabel:'DANGER', safetyColor:'#EF4444',
    duration:{ text:'18 min' }, distance:{ text:'1.9 km' },
    warnings:['Highly unsafe route', 'Multiple danger zones on path'],
    dangerZones:[STATIC_ZONES[0], STATIC_ZONES[1], STATIC_ZONES[2]],
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const getSafetyColor = (score) => {
  if (score >= 0.80) return COLORS.safe;
  if (score >= 0.60) return COLORS.moderate;
  if (score >= 0.40) return COLORS.unsafe;
  return COLORS.danger;
};

export const getSafetyLabel = (score) => {
  if (score >= 0.80) return 'SAFE';
  if (score >= 0.60) return 'MODERATE';
  if (score >= 0.40) return 'UNSAFE';
  return 'DANGER';
};

export const getSafetyEmoji = (score) => {
  if (score >= 0.80) return '🟢';
  if (score >= 0.60) return '🟡';
  if (score >= 0.40) return '🟠';
  return '🔴';
};

export const formatTime = (isoString) =>
  new Date(isoString).toLocaleString('en-IN', {
    day:'numeric', month:'short', hour:'2-digit', minute:'2-digit',
  });

export const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString('en-IN', {
    day:'numeric', month:'long', year:'numeric',
  });
