package com.safar.zone.dto;

import com.safar.zone.entity.UnsafeZone;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneDTO {
    private UUID id;
    private String type;
    private BigDecimal severity;
    private double lat;
    private double lng;
    private int radiusMeters;
    private String label;
    private String description;
    private int reportCount;
    private String source;
    
    public static ZoneDTO from(UnsafeZone zone) {
        return ZoneDTO.builder()
                .id(zone.getId())
                .type(zone.getZoneType().name())
                .severity(zone.getSeverity())
                .lat(zone.getLatitude().doubleValue())
                .lng(zone.getLongitude().doubleValue())
                .radiusMeters(zone.getRadiusMeters())
                .label(zone.getLabel())
                .description(zone.getDescription())
                .reportCount(zone.getReportCount())
                .source(zone.getSource())
                .build();
    }
}
