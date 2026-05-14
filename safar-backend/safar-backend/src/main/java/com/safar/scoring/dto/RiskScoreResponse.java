package com.safar.scoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskScoreResponse {

    private double safetyScore;
    private String safetyLabel;
    private String safetyColor;
    private Instant analyzedAt;
    private double lat;
    private double lng;
    private ScoringBreakdown breakdown;
    private List<String> warnings;
    private Map<String, Object> rawData;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoringBreakdown {
        private double incidentScore;
        private double lightingScore;
        private double weatherScore;
        private double timeScore;
        private double infrastructureScore;
        private int incidentCount;
        private int streetLampCount;
        private int cctvCount;
        private int policeStationCount;
        private double visibilityMeters;
        private String weatherCondition;
        private String timeOfDay;
    }

    public static String getLabelFromScore(double score) {
        if (score >= 0.80) return "SAFE";
        if (score >= 0.60) return "MODERATE";
        if (score >= 0.40) return "UNSAFE";
        return "DANGER";
    }

    public static String getColorFromScore(double score) {
        if (score >= 0.80) return "#22C55E";
        if (score >= 0.60) return "#EAB308";
        if (score >= 0.40) return "#F97316";
        return "#EF4444";
    }
}
