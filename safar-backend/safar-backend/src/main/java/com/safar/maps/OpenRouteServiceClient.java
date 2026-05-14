package com.safar.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.safar.maps.dto.GoogleRouteDTO;
import com.safar.route.dto.LatLng;
import com.safar.route.dto.RouteAnalysisRequest;
import com.safar.scoring.PolylineDecoder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Client for OpenRouteService API (FREE alternative to Google Maps)
 * Sign up at: https://openrouteservice.org/dev/#/signup
 * Free tier: 2000 requests/day
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OpenRouteServiceClient {
    
    private final WebClient webClient;
    
    @Value("${app.maps.openroute-api-key:}")
    private String apiKey;
    
    private static final String BASE_URL = "https://api.openrouteservice.org";
    
    /**
     * Get route alternatives from OpenRouteService
     */
    @Cacheable(value = "routes", key = "#origin.lat + '-' + #origin.lng + '-' + #destination.lat + '-' + #destination.lng")
    public List<GoogleRouteDTO> getRouteAlternatives(LatLng origin, LatLng destination,
                                                      RouteAnalysisRequest.TravelMode travelMode) {
        log.info("Fetching routes from OpenRouteService: {} -> {}", origin, destination);
        
        try {
            String profile = mapTravelModeToProfile(travelMode);
            
            // OpenRouteService directions endpoint
            String url = String.format("%s/v2/directions/%s", BASE_URL, profile);
            
            // Request body
            Map<String, Object> body = Map.of(
                    "coordinates", List.of(
                            List.of(origin.getLng(), origin.getLat()),
                            List.of(destination.getLng(), destination.getLat())
                    ),
                    "alternative_routes", Map.of(
                            "target_count", 3,
                            "weight_factor", 1.5
                    ),
                    "geometry", true,
                    "instructions", true
            );
            
            JsonNode response = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, apiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            
            return parseRoutes(response);
            
        } catch (Exception e) {
            log.error("Failed to fetch routes from OpenRouteService: {}", e.getMessage());
            // Return a simple direct route as fallback
            return List.of(createDirectRoute(origin, destination));
        }
    }
    
    private List<GoogleRouteDTO> parseRoutes(JsonNode response) {
        List<GoogleRouteDTO> routes = new ArrayList<>();
        
        if (response == null || !response.has("routes")) {
            return routes;
        }
        
        JsonNode routesNode = response.get("routes");
        for (JsonNode routeNode : routesNode) {
            JsonNode summary = routeNode.get("summary");
            
            GoogleRouteDTO route = GoogleRouteDTO.builder()
                    .encodedPolyline(routeNode.get("geometry").asText())
                    .durationSeconds((int) summary.get("duration").asDouble())
                    .distanceMeters((int) summary.get("distance").asDouble())
                    .durationText(formatDuration((int) summary.get("duration").asDouble()))
                    .distanceText(formatDistance((int) summary.get("distance").asDouble()))
                    .build();
            
            routes.add(route);
        }
        
        return routes;
    }
    
    private String mapTravelModeToProfile(RouteAnalysisRequest.TravelMode mode) {
        return switch (mode) {
            case WALKING -> "foot-walking";
            case DRIVING -> "driving-car";
            case TRANSIT -> "foot-walking";
        };
    }
    
    private GoogleRouteDTO createDirectRoute(LatLng origin, LatLng destination) {
        // Create a simple encoded polyline for direct route
        String polyline = PolylineDecoder.encode(List.of(origin, destination));
        int distance = (int) com.safar.common.util.GeoUtils.distanceInMeters(
                origin.getLat(), origin.getLng(),
                destination.getLat(), destination.getLng()
        );
        int duration = distance / 5 * 60 / 1000;  // Assume 5 km/h walking speed
        
        return GoogleRouteDTO.builder()
                .encodedPolyline(polyline)
                .durationSeconds(duration)
                .distanceMeters(distance)
                .durationText(formatDuration(duration))
                .distanceText(formatDistance(distance))
                .build();
    }
    
    private String formatDuration(int seconds) {
        int hours = seconds / 3600;
        int minutes = (seconds % 3600) / 60;
        if (hours > 0) {
            return String.format("%d hr %d min", hours, minutes);
        }
        return String.format("%d min", minutes);
    }
    
    private String formatDistance(int meters) {
        if (meters >= 1000) {
            return String.format("%.1f km", meters / 1000.0);
        }
        return String.format("%d m", meters);
    }
}
