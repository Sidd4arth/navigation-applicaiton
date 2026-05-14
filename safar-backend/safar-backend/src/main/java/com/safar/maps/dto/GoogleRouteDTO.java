package com.safar.maps.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleRouteDTO {
    private String encodedPolyline;
    private int durationSeconds;
    private int distanceMeters;
    private String durationText;
    private String distanceText;
    private List<Step> steps;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Step {
        private String instruction;
        private String encodedPolyline;
        private int distanceMeters;
        private int durationSeconds;
    }
}
