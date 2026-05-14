package com.safar.route.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteAnalysisResponse {
    private UUID analysisId;
    private Instant analyzedAt;
    private List<ScoredRouteDTO> routes;
}
