package com.safar.route.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteHistoryDTO {
    private UUID id;
    private double originLat;
    private double originLng;
    private double destLat;
    private double destLng;
    private String originAddress;
    private String destAddress;
    private Double safetyScore;
    private String travelMode;
    private Instant createdAt;
}
