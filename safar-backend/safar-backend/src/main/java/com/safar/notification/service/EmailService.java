package com.safar.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.email.authority-email:}")
    private String authorityEmail;

    @Value("${app.email.from-name:SAFAR Safety Alert}")
    private String fromName;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Async
    public void sendSosAlertEmail(String toEmail, String userName, double lat, double lng,
                                   String sosSessionId) {
        if (!emailEnabled || fromEmail.isEmpty() || fromEmail.equals("your-email@gmail.com")) {
            log.info("[EMAIL SIMULATION] To: {} | Subject: SOS ALERT from {}", toEmail, userName);
            log.info("[EMAIL SIMULATION] Location: https://maps.google.com/?q={},{}", lat, lng);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("SOS ALERT - Immediate Assistance Required");
            message.setText(String.format(
                    "EMERGENCY ALERT\n" +
                    "================\n\n" +
                    "User: %s\n" +
                    "Time: %s\n\n" +
                    "Location: https://maps.google.com/?q=%f,%f\n\n" +
                    "SOS Session: %s\n\n" +
                    "Please respond immediately.\n\n" +
                    "-- SAFAR Safety Navigation System",
                    userName, Instant.now().toString(), lat, lng, sosSessionId
            ));

            mailSender.send(message);
            log.info("SOS alert email sent to {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send SOS email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void alertAuthority(String userName, double lat, double lng, String sosSessionId) {
        if (authorityEmail != null && !authorityEmail.isEmpty()) {
            sendSosAlertEmail(authorityEmail, userName, lat, lng, sosSessionId);
        }
    }

    @Async
    public void sendSafeEmail(String toEmail, String userName) {
        if (!emailEnabled || fromEmail.isEmpty()) {
            log.info("[EMAIL SIMULATION] Safe notification to: {} for {}", toEmail, userName);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("SOS Resolved - " + userName + " is Safe");
            message.setText(String.format(
                    "%s is now safe.\n\n" +
                    "The SOS alert has been resolved at %s.\n\n" +
                    "Thank you for being there.\n\n" +
                    "-- SAFAR Safety Navigation System",
                    userName, Instant.now().toString()
            ));

            mailSender.send(message);
            log.info("Safe notification email sent to {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send safe email to {}: {}", toEmail, e.getMessage());
        }
    }
}
