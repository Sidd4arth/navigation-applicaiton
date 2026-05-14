package com.safar.report.dto;

import com.safar.report.entity.Report;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.Instant;

@Data
public class ReportRequest {
    
    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Invalid latitude")
    @DecimalMax(value = "90.0", message = "Invalid latitude")
    private Double lat;
    
    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Invalid longitude")
    @DecimalMax(value = "180.0", message = "Invalid longitude")
    private Double lng;
    
    @NotNull(message = "Category is required")
    private Report.ReportCategory category;
    
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;
    
    private Instant occurredAt;
}
