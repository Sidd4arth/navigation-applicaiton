package com.safar.notification.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    private final WebClient webClient;

    @Value("${app.sms.fast2sms-api-key:}")
    private String apiKey;

    @Value("${app.sms.enabled:false}")
    private boolean smsEnabled;

    private static final String FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

    @Async
    public void sendSms(String phone, String message) {
        if (!smsEnabled || apiKey.isEmpty() || apiKey.equals("your-fast2sms-key")) {
            log.info("[SMS SIMULATION] To: {} | Message: {}", phone, message);
            return;
        }

        try {
            webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("www.fast2sms.com")
                            .path("/dev/bulkV2")
                            .queryParam("authorization", apiKey)
                            .queryParam("message", message)
                            .queryParam("language", "english")
                            .queryParam("route", "q")
                            .queryParam("numbers", phone)
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .subscribe(
                            response -> log.info("SMS sent to {}: {}", phone, response),
                            error -> log.error("SMS failed to {}: {}", phone, error.getMessage())
                    );
        } catch (Exception e) {
            log.error("SMS error to {}: {}", phone, e.getMessage());
        }
    }

    @Async
    public void sendBulkSms(List<String> phones, String message) {
        for (String phone : phones) {
            sendSms(phone, message);
        }
    }

    @Async
    public void sendSosAlert(String phone, String userName, double lat, double lng,
                              String sosSessionId, String appBaseUrl) {
        String message = String.format(
                "EMERGENCY ALERT: %s triggered SOS! " +
                "Location: https://maps.google.com/?q=%f,%f " +
                "Track live: %s/track/%s " +
                "Call 112 if needed.",
                userName, lat, lng, appBaseUrl, sosSessionId
        );
        sendSms(phone, message);
    }

    @Async
    public void sendSafeAlert(String phone, String userName) {
        String message = String.format(
                "%s is now safe. SOS has been resolved. Thank you for being there.",
                userName
        );
        sendSms(phone, message);
    }
}
