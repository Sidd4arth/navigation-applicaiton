package com.safar.zone.dto;

import com.safar.zone.entity.UnsafeZone;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ZoneRequest {
    
    @NotNull(message = "Zone type is required")
    private UnsafeZone.ZoneType type;
    
    @NotNull(message = "Severity is required")
    @DecimalMin(value = "0.0", message = "Severity must be at least 0.0")
    @DecimalMax(value = "1.0", message = "Severity must be at most 1.0")
    private BigDecimal severity;
    
    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Invalid latitude")
    @DecimalMax(value = "90.0", message = "Invalid latitude")
    private Double lat;
    
    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Invalid longitude")
    @DecimalMax(value = "180.0", message = "Invalid longitude")
    private Double lng;
    
    @Min(value = 10, message = "Radius must be at least 10 meters")
    @Max(value = 1000, message = "Radius cannot exceed 1000 meters")
    private Integer radiusMeters = 100;
    
    @Size(max = 255, message = "Label cannot exceed 255 characters")
    private String label;
    
    private String description;
}
