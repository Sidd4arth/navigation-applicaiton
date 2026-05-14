package com.safar.sos.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safar.common.exception.SafarException;
import com.safar.notification.service.EmailService;
import com.safar.notification.service.SmsService;
import com.safar.sos.dto.SosEventDTO;
import com.safar.sos.dto.SosLocationUpdate;
import com.safar.sos.dto.SosTriggerRequest;
import com.safar.sos.entity.EmergencyEvent;
import com.safar.sos.entity.TrustedContact;
import com.safar.sos.repository.EmergencyEventRepository;
import com.safar.sos.repository.TrustedContactRepository;
import com.safar.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class SosService {

    private final EmergencyEventRepository eventRepository;
    private final TrustedContactRepository contactRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SmsService smsService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    @Value("${app.sos.expiry-minutes:30}")
    private int sosExpiryMinutes;

    @Value("${app.sos.app-base-url:https://safar.app}")
    private String appBaseUrl;

    @Transactional
    public SosEventDTO triggerSos(SosTriggerRequest request, User user) {
        Optional<EmergencyEvent> existing = eventRepository.findByUserIdAndStatus(
                user.getId(), EmergencyEvent.EventStatus.ACTIVE);

        if (existing.isPresent()) {
            throw SafarException.badRequest("SOS_ALREADY_ACTIVE",
                    "You already have an active SOS. Resolve it first.");
        }

        EmergencyEvent newEvent = EmergencyEvent.builder()
                .user(user)
                .status(EmergencyEvent.EventStatus.ACTIVE)
                .triggerLat(BigDecimal.valueOf(request.getLat()))
                .triggerLng(BigDecimal.valueOf(request.getLng()))
                .lastLat(BigDecimal.valueOf(request.getLat()))
                .lastLng(BigDecimal.valueOf(request.getLng()))
                .message(request.getMessage())
                .locationLog(createLocationLog(request.getLat(), request.getLng()))
                .expiresAt(Instant.now().plus(sosExpiryMinutes, ChronoUnit.MINUTES))
                .build();

        final EmergencyEvent savedEvent = eventRepository.save(newEvent);
        final String savedEventId = savedEvent.getId().toString();

        log.warn("SOS TRIGGERED: User {} ({}) at ({}, {})",
                user.getName(), user.getId(), request.getLat(), request.getLng());

        CompletableFuture.allOf(
                CompletableFuture.runAsync(() ->
                        alertContactsSms(user, request.getLat(), request.getLng(), savedEventId)),
                CompletableFuture.runAsync(() ->
                        alertContactsEmail(user, request.getLat(), request.getLng(), savedEventId)),
                CompletableFuture.runAsync(() ->
                        emailService.alertAuthority(user.getName(), request.getLat(), request.getLng(), savedEventId)),
                CompletableFuture.runAsync(() ->
                        broadcastSosUpdate(savedEvent, "SOS_TRIGGERED"))
        ).exceptionally(ex -> {
            log.error("Error in parallel SOS alert execution: {}", ex.getMessage());
            return null;
        });

        return SosEventDTO.from(savedEvent);
    }

    @Transactional
    public void updateLocation(UUID eventId, SosLocationUpdate update, User user) {
        EmergencyEvent foundEvent = eventRepository.findByIdAndUserIdAndStatus(
                eventId, user.getId(), EmergencyEvent.EventStatus.ACTIVE)
                .orElseThrow(() -> SafarException.notFound("SOS_NOT_FOUND",
                        "Active SOS event not found"));

        foundEvent.setLastLat(BigDecimal.valueOf(update.getLat()));
        foundEvent.setLastLng(BigDecimal.valueOf(update.getLng()));
        appendToLocationLog(foundEvent, update.getLat(), update.getLng());

        final EmergencyEvent updatedEvent = eventRepository.save(foundEvent);

        broadcastSosUpdate(updatedEvent, "LOCATION_UPDATE");
    }

    public void broadcastLocationViaWebSocket(String sosSessionId, double lat, double lng) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "LOCATION_UPDATE");
        payload.put("eventId", sosSessionId);
        payload.put("lat", lat);
        payload.put("lng", lng);
        payload.put("timestamp", Instant.now().toString());

        messagingTemplate.convertAndSend("/topic/sos/" + sosSessionId, payload);
    }

    @Transactional
    public SosEventDTO resolveSos(UUID eventId, User user) {
        EmergencyEvent foundEvent = eventRepository.findByIdAndUserIdAndStatus(
                eventId, user.getId(), EmergencyEvent.EventStatus.ACTIVE)
                .orElseThrow(() -> SafarException.notFound("SOS_NOT_FOUND",
                        "Active SOS event not found"));

        foundEvent.setStatus(EmergencyEvent.EventStatus.RESOLVED);
        foundEvent.setResolvedAt(Instant.now());
        final EmergencyEvent resolvedEvent = eventRepository.save(foundEvent);

        log.info("SOS RESOLVED: Event {} by user {} ({})",
                eventId, user.getName(), user.getId());

        CompletableFuture.allOf(
                CompletableFuture.runAsync(() -> sendSafeSmsBulk(user)),
                CompletableFuture.runAsync(() -> sendSafeEmailBulk(user)),
                CompletableFuture.runAsync(() -> broadcastSosUpdate(resolvedEvent, "SOS_RESOLVED"))
        ).exceptionally(ex -> {
            log.error("Error in parallel SOS resolve alerts: {}", ex.getMessage());
            return null;
        });

        return SosEventDTO.from(resolvedEvent);
    }

    public Optional<SosEventDTO> getActiveSos(User user) {
        return eventRepository.findByUserIdAndStatus(user.getId(), EmergencyEvent.EventStatus.ACTIVE)
                .map(SosEventDTO::from);
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void expireOldEvents() {
        int expired = eventRepository.expireOldEvents(Instant.now());
        if (expired > 0) {
            log.info("Auto-expired {} SOS events", expired);
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    private void alertContactsSms(User user, double lat, double lng, String sosSessionId) {
        List<TrustedContact> contacts = contactRepository
                .findByUserIdOrderByIsPrimaryDescCreatedAtAsc(user.getId());

        if (contacts.isEmpty()) {
            log.warn("User {} has no emergency contacts configured", user.getId());
            return;
        }

        for (TrustedContact contact : contacts) {
            smsService.sendSosAlert(contact.getPhone(), user.getName(), lat, lng, sosSessionId, appBaseUrl);
        }
        log.info("SOS SMS alerts sent to {} contacts for user {}", contacts.size(), user.getName());
    }

    private void alertContactsEmail(User user, double lat, double lng, String sosSessionId) {
        List<TrustedContact> contacts = contactRepository
                .findByUserIdOrderByIsPrimaryDescCreatedAtAsc(user.getId());

        for (TrustedContact contact : contacts) {
            if (contact.getEmail() != null && !contact.getEmail().isEmpty()) {
                emailService.sendSosAlertEmail(contact.getEmail(), user.getName(), lat, lng, sosSessionId);
            }
        }
    }

    private void sendSafeSmsBulk(User user) {
        List<TrustedContact> contacts = contactRepository
                .findByUserIdOrderByIsPrimaryDescCreatedAtAsc(user.getId());

        for (TrustedContact contact : contacts) {
            smsService.sendSafeAlert(contact.getPhone(), user.getName());
        }
    }

    private void sendSafeEmailBulk(User user) {
        List<TrustedContact> contacts = contactRepository
                .findByUserIdOrderByIsPrimaryDescCreatedAtAsc(user.getId());

        for (TrustedContact contact : contacts) {
            if (contact.getEmail() != null && !contact.getEmail().isEmpty()) {
                emailService.sendSafeEmail(contact.getEmail(), user.getName());
            }
        }
    }

    private void broadcastSosUpdate(EmergencyEvent sosEvent, String type) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", type);
        payload.put("eventId", sosEvent.getId().toString());
        payload.put("userId", sosEvent.getUser().getId().toString());
        payload.put("userName", sosEvent.getUser().getName());
        payload.put("lat", sosEvent.getLastLat().doubleValue());
        payload.put("lng", sosEvent.getLastLng().doubleValue());
        payload.put("status", sosEvent.getStatus().name());
        payload.put("timestamp", Instant.now().toString());
        payload.put("emergencyNumber", "112");
        payload.put("dialIntent", "tel:112");

        String destination = "/topic/sos/" + sosEvent.getId();
        messagingTemplate.convertAndSend(destination, payload);
        log.debug("Broadcast {} to {}", type, destination);
    }

    private String createLocationLog(double lat, double lng) {
        List<Map<String, Object>> logList = new ArrayList<>();
        logList.add(Map.of("lat", lat, "lng", lng, "ts", Instant.now().toString()));
        try {
            return objectMapper.writeValueAsString(logList);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private void appendToLocationLog(EmergencyEvent sosEvent, double lat, double lng) {
        try {
            List<Map<String, Object>> logList = objectMapper.readValue(
                    sosEvent.getLocationLog(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class)
            );
            logList.add(Map.of("lat", lat, "lng", lng, "ts", Instant.now().toString()));
            if (logList.size() > 100) {
                logList = logList.subList(logList.size() - 100, logList.size());
            }
            sosEvent.setLocationLog(objectMapper.writeValueAsString(logList));
        } catch (JsonProcessingException e) {
            log.error("Failed to update location log", e);
        }
    }
}
