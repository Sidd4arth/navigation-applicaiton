package com.safar.sos.dto;

import com.safar.sos.entity.EmergencyEvent;
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
public class SosEventDTO {
    private UUID eventId;
    private String status;
    private double triggerLat;
    private double triggerLng;
    private Double lastLat;
    private Double lastLng;
    private String message;
    private String wsChannel;
    private Instant triggeredAt;
    private Instant expiresAt;
    
    public static SosEventDTO from(EmergencyEvent event) {
        return SosEventDTO.builder()
                .eventId(event.getId())
                .status(event.getStatus().name())
                .triggerLat(event.getTriggerLat().doubleValue())
                .triggerLng(event.getTriggerLng().doubleValue())
                .lastLat(event.getLastLat() != null ? event.getLastLat().doubleValue() : null)
                .lastLng(event.getLastLng() != null ? event.getLastLng().doubleValue() : null)
                .message(event.getMessage())
                .wsChannel("/topic/sos/" + event.getId())
                .triggeredAt(event.getTriggeredAt())
                .expiresAt(event.getExpiresAt())
                .build();
    }
}
