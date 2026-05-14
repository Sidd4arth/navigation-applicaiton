# SAFAR Backend - Intelligent Safe Route Navigation System

## 🚀 Quick Start (Fresh Setup)

### Prerequisites
- Java 21 (or 17)
- PostgreSQL 16 with PostGIS extension
- Docker (for PostgreSQL) OR local PostgreSQL install

### Step 1: Start PostgreSQL with PostGIS

**Using Docker (Recommended):**
```bash
docker run --name safar-postgres \
  -e POSTGRES_DB=safar_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgis/postgis:16-3.4-alpine
```

**Using Local PostgreSQL:**
- Create database called `safar_db`
- Update password in `src/main/resources/application-dev.yml`

### Step 2: Import into STS/IntelliJ
1. File → Import → Maven → Existing Maven Projects
2. Browse to this `safar-backend` folder
3. Click Finish
4. Wait for dependencies to download
5. Right-click project → Maven → Update Project

### Step 3: Run the Application
- Right-click `SafarBackendApplication.java` → Run As → Spring Boot App
- Flyway will auto-create all tables and seed data on first run

### Step 4: Test
```bash
curl http://localhost:8080/api/v1/health
```

---

## 🔑 API Keys (Optional - Works Without Them)

| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| OpenRouteService | Route directions | 2000/day | https://openrouteservice.org/dev/#/signup |
| OpenWeatherMap | Weather/visibility | 1000/day | https://home.openweathermap.org/users/sign_up |
| Fast2SMS | SMS alerts (India) | Limited | https://www.fast2sms.com/ |
| Gmail SMTP | Email alerts | Unlimited | Use your Gmail + App Password |

**Without any keys:** All features work. Routes return fallback, weather defaults to clear, SMS/Email log to console.

Add keys in `src/main/resources/application.yml`.

---

## 📋 All 18 API Endpoints

### Auth (No token needed)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login, get JWT token |
| POST | `/api/v1/auth/refresh` | Refresh expired token |

### User (Token required)
| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/v1/users/me` | Get my profile |
| PUT | `/api/v1/users/me/fcm-token` | Update push token |

### Zones (No token needed)
| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/v1/zones` | List all zones |
| GET | `/api/v1/zones/nearby?lat=&lng=&radius=` | Zones near point |
| POST | `/api/v1/zones` | Create zone (needs token) |
| PUT | `/api/v1/zones/{id}` | Update zone (needs token) |
| DELETE | `/api/v1/zones/{id}` | Delete zone (needs token) |

### Safety Score (No token needed)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/v1/safety/score` | Real-time risk analysis |

### Reports (Token required)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/v1/reports` | Submit incident report |
| GET | `/api/v1/reports?minLat=&maxLat=&minLng=&maxLng=` | Get reports in area |
| GET | `/api/v1/reports/mine` | My reports |

### Routes (Token required)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/v1/routes/analyze` | Analyze safe routes |
| GET | `/api/v1/routes/history` | Route history |

### Emergency Contacts (Token required)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/v1/contacts` | Add emergency contact |
| GET | `/api/v1/contacts` | List my contacts |
| DELETE | `/api/v1/contacts/{id}` | Remove contact |

### SOS (Token required)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/v1/sos/trigger` | Trigger SOS + alert contacts |
| POST | `/api/v1/sos/{id}/location` | Update live location |
| POST | `/api/v1/sos/resolve` | Resolve SOS |
| DELETE | `/api/v1/sos/{id}` | Resolve SOS (alt) |
| GET | `/api/v1/sos/active` | Check active SOS |

---

## 📁 Project Structure

```
com.safar/
├── SafarBackendApplication.java
├── auth/          # JWT Authentication
├── user/          # User profile management
├── route/         # Route analysis & scoring
├── scoring/       # Real-time risk engine (OSM + Weather + DB)
├── zone/          # Unsafe zone CRUD
├── report/        # Community incident reports
├── sos/           # Emergency SOS + Contacts
├── maps/          # External API clients (OpenRoute, Overpass, Weather)
├── notification/  # SMS (Fast2SMS) + Email (Gmail SMTP)
├── common/        # DTOs, exceptions, utilities
└── config/        # Security, WebSocket, Cache, CORS
```
