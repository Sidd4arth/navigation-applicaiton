package com.safar.scoring;

import com.safar.common.util.GeoUtils;
import com.safar.route.dto.LatLng;
import com.safar.scoring.dto.ScoreResult;
import com.safar.zone.dto.ZoneDTO;
import com.safar.zone.entity.UnsafeZone;
import com.safar.zone.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SafetyScoringEngine {
    
    private final ZoneRepository zoneRepository;
    
    @Value("${app.scoring.max-danger:10.0}")
    private double maxDanger;
    
    @Value("${app.scoring.zone-buffer-meters:150}")
    private double zoneBufferMeters;
    
    // Zone type weights
    private static final Map<String, Double> ZONE_TYPE_WEIGHTS = Map.of(
            "CRIME_HOTSPOT", 1.0,
            "HARASSMENT", 0.9,
            "THEFT", 0.85,
            "ISOLATED", 0.7,
            "POOR_LIGHTING", 0.6,
            "UNSAFE_ROAD", 0.5
    );
    
    /**
     * Score a route based on its path and current time
     */
    @Cacheable(value = "routeScores", key = "#encodedPolyline.hashCode() + '-' + #currentTime.hour")
    public ScoreResult scoreRoute(String encodedPolyline, LocalTime currentTime) {
        List<LatLng> routePoints = PolylineDecoder.decode(encodedPolyline);
        return scoreRoute(routePoints, currentTime);
    }
    
    public ScoreResult scoreRoute(List<LatLng> routePoints, LocalTime currentTime) {
        // Find all zones near the route
        Set<ZoneDTO> encounteredZones = new HashSet<>();
        double rawDanger = 0.0;
        List<String> warnings = new ArrayList<>();
        
        // Sample points along the route (every 5th point for performance)
        for (int i = 0; i < routePoints.size(); i += 5) {
            LatLng point = routePoints.get(i);
            
            // Find zones within buffer distance of this point
            List<UnsafeZone> nearbyZones = findZonesNear(point.getLat(), point.getLng());
            
            for (UnsafeZone zone : nearbyZones) {
                double distance = GeoUtils.distanceInMeters(
                        point.getLat(), point.getLng(),
                        zone.getLatitude().doubleValue(), zone.getLongitude().doubleValue()
                );
                
                // Calculate danger contribution from this zone
                double proximityWeight = Math.max(0, 1.0 - (distance / (zone.getRadiusMeters() + zoneBufferMeters)));
                double typeWeight = ZONE_TYPE_WEIGHTS.getOrDefault(zone.getZoneType().name(), 0.5);
                double zoneDanger = zone.getSeverity().doubleValue() * proximityWeight * typeWeight;
                
                rawDanger += zoneDanger;
                encounteredZones.add(ZoneDTO.from(zone));
            }
        }
        
        // Apply time multiplier
        double timeMultiplier = TimeRiskCalculator.getTimeMultiplier(currentTime);
        rawDanger *= timeMultiplier;
        
        // Add warnings based on time
        if (timeMultiplier > 1.0) {
            warnings.add("Night/low-visibility travel increases risk");
        }
        
        // Add warnings for zone count
        if (encounteredZones.size() > 3) {
            warnings.add(String.format("Route passes through %d flagged zones", encounteredZones.size()));
        }
        
        // Normalize danger score
        double normalizedDanger = Math.min(rawDanger / maxDanger, 1.0);
        
        // Safety score is inverse of danger
        double safetyScore = Math.round((1.0 - normalizedDanger) * 1000.0) / 1000.0;
        
        log.debug("Route scored: safetyScore={}, zones={}, timeMultiplier={}", 
                safetyScore, encounteredZones.size(), timeMultiplier);
        
        return ScoreResult.builder()
                .safetyScore(safetyScore)
                .rawDangerScore(rawDanger)
                .normalizedDangerScore(normalizedDanger)
                .timeMultiplier(timeMultiplier)
                .communityBoost(0.0)
                .dangerZones(new ArrayList<>(encounteredZones))
                .warnings(warnings)
                .build();
    }
    
    private List<UnsafeZone> findZonesNear(double lat, double lng) {
        // Use bounding box query for performance
        double latBuffer = zoneBufferMeters / 111000.0;
        double lngBuffer = zoneBufferMeters / (111000.0 * Math.cos(Math.toRadians(lat)));
        
        return zoneRepository.findByBoundingBox(
                java.math.BigDecimal.valueOf(lat - latBuffer),
                java.math.BigDecimal.valueOf(lat + latBuffer),
                java.math.BigDecimal.valueOf(lng - lngBuffer),
                java.math.BigDecimal.valueOf(lng + lngBuffer)
        );
    }
    
    /**
     * Rank multiple routes by safety score (highest first)
     */
    public List<ScoreResult> rankRoutes(List<ScoreResult> scoredRoutes) {
        return scoredRoutes.stream()
                .sorted((a, b) -> Double.compare(b.getSafetyScore(), a.getSafetyScore()))
                .collect(Collectors.toList());
    }
}
