package com.safar.route.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safar.common.dto.PageResponse;
import com.safar.maps.OpenRouteServiceClient;
import com.safar.maps.dto.GoogleRouteDTO;
import com.safar.route.dto.*;
import com.safar.route.entity.RouteHistory;
import com.safar.route.repository.RouteHistoryRepository;
import com.safar.scoring.SafetyScoringEngine;
import com.safar.scoring.dto.ScoreResult;
import com.safar.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteService {
    
    private final OpenRouteServiceClient mapsClient;
    private final SafetyScoringEngine scoringEngine;
    private final RouteHistoryRepository routeHistoryRepository;
    private final ObjectMapper objectMapper;
    
    /**
     * Analyze routes between origin and destination, scoring each for safety
     */
    @Transactional
    public RouteAnalysisResponse analyzeRoutes(RouteAnalysisRequest request, User user) {
        log.info("Analyzing routes for user {}: {} -> {}", 
                user.getId(), request.getOrigin(), request.getDestination());
        
        // 1. Fetch route alternatives from maps service
        List<GoogleRouteDTO> rawRoutes = mapsClient.getRouteAlternatives(
                request.getOrigin(),
                request.getDestination(),
                request.getTravelMode()
        );
        
        if (rawRoutes.isEmpty()) {
            log.warn("No routes found between {} and {}", request.getOrigin(), request.getDestination());
            return RouteAnalysisResponse.builder()
                    .analysisId(UUID.randomUUID())
                    .analyzedAt(Instant.now())
                    .routes(List.of())
                    .build();
        }
        
        // 2. Score each route
        LocalTime currentTime = LocalTime.now();
        List<ScoredRouteDTO> scoredRoutes = new ArrayList<>();
        
        for (GoogleRouteDTO rawRoute : rawRoutes) {
            ScoreResult score = scoringEngine.scoreRoute(rawRoute.getEncodedPolyline(), currentTime);
            
            ScoredRouteDTO scoredRoute = ScoredRouteDTO.builder()
                    .routeId(UUID.randomUUID())
                    .safetyScore(score.getSafetyScore())
                    .safetyLabel(ScoredRouteDTO.getSafetyLabel(score.getSafetyScore()))
                    .safetyColor(ScoredRouteDTO.getSafetyColor(score.getSafetyScore()))
                    .encodedPolyline(rawRoute.getEncodedPolyline())
                    .duration(ScoredRouteDTO.Duration.builder()
                            .value(rawRoute.getDurationSeconds())
                            .text(rawRoute.getDurationText())
                            .build())
                    .distance(ScoredRouteDTO.Distance.builder()
                            .value(rawRoute.getDistanceMeters())
                            .text(rawRoute.getDistanceText())
                            .build())
                    .dangerZones(score.getDangerZones())
                    .warnings(score.getWarnings())
                    .build();
            
            scoredRoutes.add(scoredRoute);
        }
        
        // 3. Sort by safety score (highest first) and assign ranks
        scoredRoutes.sort((a, b) -> Double.compare(b.getSafetyScore(), a.getSafetyScore()));
        for (int i = 0; i < scoredRoutes.size(); i++) {
            scoredRoutes.get(i).setRank(i + 1);
            scoredRoutes.get(i).setRecommended(i == 0);
        }
        
        // 4. Save to history
        UUID analysisId = saveRouteHistory(request, scoredRoutes, user);
        
        log.info("Route analysis complete. {} routes scored. Best score: {}", 
                scoredRoutes.size(), 
                scoredRoutes.isEmpty() ? "N/A" : scoredRoutes.get(0).getSafetyScore());
        
        return RouteAnalysisResponse.builder()
                .analysisId(analysisId)
                .analyzedAt(Instant.now())
                .routes(scoredRoutes)
                .build();
    }
    
    private UUID saveRouteHistory(RouteAnalysisRequest request, 
                                  List<ScoredRouteDTO> routes, User user) {
        try {
            ScoredRouteDTO recommended = routes.isEmpty() ? null : routes.get(0);
            
            RouteHistory history = RouteHistory.builder()
                    .user(user)
                    .originLat(BigDecimal.valueOf(request.getOrigin().getLat()))
                    .originLng(BigDecimal.valueOf(request.getOrigin().getLng()))
                    .destLat(BigDecimal.valueOf(request.getDestination().getLat()))
                    .destLng(BigDecimal.valueOf(request.getDestination().getLng()))
                    .originAddress(request.getOrigin().getAddress())
                    .destAddress(request.getDestination().getAddress())
                    .selectedRoute(objectMapper.writeValueAsString(recommended))
                    .allRoutes(objectMapper.writeValueAsString(routes))
                    .safetyScore(recommended != null ? 
                            BigDecimal.valueOf(recommended.getSafetyScore()) : null)
                    .wasRecommended(true)
                    .travelMode(request.getTravelMode().name())
                    .build();
            
            history = routeHistoryRepository.save(history);
            return history.getId();
            
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize route history", e);
            return UUID.randomUUID();
        }
    }
    
    public PageResponse<RouteHistoryDTO> getRouteHistory(UUID userId, int page, int size) {
        Page<RouteHistory> historyPage = routeHistoryRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(page, size));
        
        Page<RouteHistoryDTO> dtoPage = historyPage.map(this::mapToDTO);
        return PageResponse.from(dtoPage);
    }
    
    private RouteHistoryDTO mapToDTO(RouteHistory history) {
        return RouteHistoryDTO.builder()
                .id(history.getId())
                .originLat(history.getOriginLat().doubleValue())
                .originLng(history.getOriginLng().doubleValue())
                .destLat(history.getDestLat().doubleValue())
                .destLng(history.getDestLng().doubleValue())
                .originAddress(history.getOriginAddress())
                .destAddress(history.getDestAddress())
                .safetyScore(history.getSafetyScore() != null ? 
                        history.getSafetyScore().doubleValue() : null)
                .travelMode(history.getTravelMode())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
