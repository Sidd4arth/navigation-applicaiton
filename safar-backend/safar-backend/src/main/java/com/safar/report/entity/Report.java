package com.safar.report.entity;

import com.safar.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ReportCategory category;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;
    
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;
    
    @Column(length = 20)
    @Builder.Default
    @Enumerated(EnumType.STRING)
    private ReportStatus status = ReportStatus.PENDING;
    
    @Column(name = "occurred_at")
    private Instant occurredAt;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    public enum ReportCategory {
        HARASSMENT,
        THEFT,
        POOR_LIGHTING,
        UNSAFE_ROAD,
        SUSPICIOUS_ACTIVITY,
        OTHER
    }
    
    public enum ReportStatus {
        PENDING,
        VERIFIED,
        REJECTED
    }
}
