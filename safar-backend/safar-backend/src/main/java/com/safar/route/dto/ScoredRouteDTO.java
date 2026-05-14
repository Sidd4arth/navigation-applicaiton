package com.safar.route.dto;

import com.safar.zone.dto.ZoneDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoredRouteDTO {
    private UUID routeId;
    private int rank;
    private boolean recommended;
    private double safetyScore;
    private String safetyLabel;
    private String safetyColor;
    private String encodedPolyline;
    private Duration duration;
    private Distance distance;
    private List<ZoneDTO> dangerZones;
    private List<String> warnings;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Duration {
        private int value;
        private String text;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Distance {
        private int value;
        private String text;
    }
    
    public static String getSafetyColor(double score) {
        if (score >= 0.80) return "#22C55E";
        if (score >= 0.60) return "#EAB308";
        if (score >= 0.40) return "#F97316";
        return "#EF4444";
    }
    
    public static String getSafetyLabel(double score) {
        if (score >= 0.80) return "SAFE";
        if (score >= 0.60) return "MODERATE";
        if (score >= 0.40) return "UNSAFE";
        return "DANGER";
    }
}
