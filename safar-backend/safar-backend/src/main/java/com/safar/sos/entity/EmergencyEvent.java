package com.safar.sos.entity;

import com.safar.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emergency_events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyEvent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EventStatus status = EventStatus.ACTIVE;
    
    @Column(name = "trigger_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal triggerLat;
    
    @Column(name = "trigger_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal triggerLng;
    
    @Column(name = "last_lat", precision = 10, scale = 7)
    private BigDecimal lastLat;
    
    @Column(name = "last_lng", precision = 10, scale = 7)
    private BigDecimal lastLng;
    
    @Column(columnDefinition = "TEXT")
    private String message;
    
    @Column(name = "location_log", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private String locationLog = "[]";
    
    @CreationTimestamp
    @Column(name = "triggered_at", nullable = false, updatable = false)
    private Instant triggeredAt;
    
    @Column(name = "resolved_at")
    private Instant resolvedAt;
    
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    
    public enum EventStatus {
        ACTIVE,
        RESOLVED,
        EXPIRED
    }
}
