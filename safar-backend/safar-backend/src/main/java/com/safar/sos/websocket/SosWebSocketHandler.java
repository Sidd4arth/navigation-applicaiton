package com.safar.sos.websocket;

import com.safar.sos.service.SosService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class SosWebSocketHandler {

    private final SosService sosService;

    @MessageMapping("/sos/location")
    public void handleLocationUpdate(@Payload Map<String, Object> payload) {
        try {
            String sosSessionId = (String) payload.get("sosSessionId");
            double lat = ((Number) payload.get("lat")).doubleValue();
            double lng = ((Number) payload.get("lng")).doubleValue();

            log.debug("WebSocket location update - Session: {}, ({}, {})", sosSessionId, lat, lng);

            sosService.broadcastLocationViaWebSocket(sosSessionId, lat, lng);

        } catch (Exception e) {
            log.error("Error processing WebSocket location update: {}", e.getMessage());
        }
    }
}
