package com.safar.report.dto;

import com.safar.report.entity.Report;
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
public class ReportDTO {
    private UUID id;
    private String category;
    private String description;
    private double lat;
    private double lng;
    private String status;
    private Instant occurredAt;
    private Instant createdAt;
    
    public static ReportDTO from(Report report) {
        return ReportDTO.builder()
                .id(report.getId())
                .category(report.getCategory().name())
                .description(report.getDescription())
                .lat(report.getLatitude().doubleValue())
                .lng(report.getLongitude().doubleValue())
                .status(report.getStatus().name())
                .occurredAt(report.getOccurredAt())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
