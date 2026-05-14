-- Trusted Contacts table for SOS emergency contacts
CREATE TABLE IF NOT EXISTS trusted_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    relationship VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON trusted_contacts(user_id);

-- Fix: Make location columns nullable (Java entities don't set PostGIS GEOGRAPHY directly)
ALTER TABLE unsafe_zones ALTER COLUMN location DROP NOT NULL;
ALTER TABLE reports ALTER COLUMN location DROP NOT NULL;

-- Auto-generate PostGIS location from lat/lng on unsafe_zones
CREATE OR REPLACE FUNCTION update_zone_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_GeogFromText('POINT(' || NEW.longitude || ' ' || NEW.latitude || ')');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_zone_location ON unsafe_zones;
CREATE TRIGGER trigger_update_zone_location
    BEFORE INSERT OR UPDATE ON unsafe_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_zone_location();

-- Auto-generate PostGIS location from lat/lng on reports
CREATE OR REPLACE FUNCTION update_report_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_GeogFromText('POINT(' || NEW.longitude || ' ' || NEW.latitude || ')');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_location ON reports;
CREATE TRIGGER trigger_update_report_location
    BEFORE INSERT OR UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_report_location();
