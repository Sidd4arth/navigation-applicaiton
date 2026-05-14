package com.safar.sos.controller;

import com.safar.common.dto.ApiResponse;
import com.safar.sos.dto.SosEventDTO;
import com.safar.sos.dto.SosLocationUpdate;
import com.safar.sos.dto.SosTriggerRequest;
import com.safar.sos.service.SosService;
import com.safar.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/sos")
@RequiredArgsConstructor
public class SosController {

    private final SosService sosService;

    @PostMapping("/trigger")
    public ResponseEntity<ApiResponse<SosEventDTO>> triggerSos(
            @Valid @RequestBody SosTriggerRequest request,
            @AuthenticationPrincipal User user) {

        SosEventDTO sosEvent = sosService.triggerSos(request, user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("SOS activated. Contacts notified. Call 112 if needed.", sosEvent));
    }

    @PostMapping("/{eventId}/location")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> updateLocation(
            @PathVariable UUID eventId,
            @Valid @RequestBody SosLocationUpdate update,
            @AuthenticationPrincipal User user) {

        sosService.updateLocation(eventId, update, user);
        return ResponseEntity.ok(ApiResponse.success(Map.of("received", true)));
    }

    @PostMapping("/resolve")
    public ResponseEntity<ApiResponse<SosEventDTO>> resolveSosPost(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User user) {

        UUID eventId = UUID.fromString(request.get("sosSessionId"));
        SosEventDTO sosEvent = sosService.resolveSos(eventId, user);
        return ResponseEntity.ok(ApiResponse.success(
                "SOS resolved. Your contacts have been notified that you are safe.", sosEvent));
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<ApiResponse<SosEventDTO>> resolveSos(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal User user) {

        SosEventDTO sosEvent = sosService.resolveSos(eventId, user);
        return ResponseEntity.ok(ApiResponse.success(
                "SOS resolved. Your contacts have been notified that you are safe.", sosEvent));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<SosEventDTO>> getActiveSos(
            @AuthenticationPrincipal User user) {

        Optional<SosEventDTO> sosEvent = sosService.getActiveSos(user);
        return sosEvent.map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElse(ResponseEntity.ok(ApiResponse.success(null)));
    }
}
