-- Seed demo unsafe zones (Delhi area - adjust coordinates for your city)
INSERT INTO unsafe_zones (zone_type, severity, latitude, longitude, location, radius_meters, label, description, source) VALUES
-- Crime Hotspots
('CRIME_HOTSPOT', 0.90, 28.6289, 77.2310, ST_GeogFromText('POINT(77.2310 28.6289)'), 250, 'High theft zone', '42 reported incidents in last 6 months', 'ADMIN'),
('CRIME_HOTSPOT', 0.85, 28.6155, 77.2290, ST_GeogFromText('POINT(77.2290 28.6155)'), 200, 'Robbery hotspot', 'Multiple robbery incidents reported', 'ADMIN'),
('CRIME_HOTSPOT', 0.80, 28.6350, 77.2150, ST_GeogFromText('POINT(77.2150 28.6350)'), 180, 'Vehicle theft area', 'High vehicle theft incidents', 'ADMIN'),

-- Poor Lighting
('POOR_LIGHTING', 0.65, 28.6201, 77.2180, ST_GeogFromText('POINT(77.2180 28.6201)'), 150, 'No street lighting', 'Street lights non-functional', 'ADMIN'),
('POOR_LIGHTING', 0.60, 28.6098, 77.2350, ST_GeogFromText('POINT(77.2350 28.6098)'), 120, 'Dim lighting zone', 'Insufficient street lighting', 'ADMIN'),
('POOR_LIGHTING', 0.55, 28.6420, 77.2080, ST_GeogFromText('POINT(77.2080 28.6420)'), 100, 'Dark alley', 'No lighting in alley', 'ADMIN'),

-- Harassment zones
('HARASSMENT', 0.85, 28.6155, 77.2290, ST_GeogFromText('POINT(77.2290 28.6155)'), 200, 'Harassment hotspot', '15 harassment reports', 'COMMUNITY'),
('HARASSMENT', 0.75, 28.6300, 77.2400, ST_GeogFromText('POINT(77.2400 28.6300)'), 150, 'Eve teasing reports', 'Multiple reports of eve teasing', 'COMMUNITY'),

-- Isolated areas
('ISOLATED', 0.70, 28.6098, 77.2410, ST_GeogFromText('POINT(77.2410 28.6098)'), 300, 'Isolated underpass', 'Low footfall area', 'ADMIN'),
('ISOLATED', 0.65, 28.5900, 77.2200, ST_GeogFromText('POINT(77.2200 28.5900)'), 250, 'Deserted stretch', 'Very low foot traffic', 'ADMIN'),

-- Unsafe roads
('UNSAFE_ROAD', 0.55, 28.6500, 77.2300, ST_GeogFromText('POINT(77.2300 28.6500)'), 150, 'Accident prone', 'High traffic accidents', 'ADMIN'),
('UNSAFE_ROAD', 0.50, 28.6100, 77.2500, ST_GeogFromText('POINT(77.2500 28.6100)'), 120, 'Bad road condition', 'Poor road maintenance', 'ADMIN');
