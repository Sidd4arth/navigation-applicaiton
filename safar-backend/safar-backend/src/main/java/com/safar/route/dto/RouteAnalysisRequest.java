package com.safar.route.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RouteAnalysisRequest {
    
    @NotNull(message = "Origin is required")
    @Valid
    private LatLng origin;
    
    @NotNull(message = "Destination is required")
    @Valid
    private LatLng destination;
    
    private TravelMode travelMode = TravelMode.WALKING;
    
    public enum TravelMode {
        WALKING, DRIVING, TRANSIT
    }
}
