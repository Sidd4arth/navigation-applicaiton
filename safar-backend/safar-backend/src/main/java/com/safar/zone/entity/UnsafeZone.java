package com.safar.zone.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "unsafe_zones")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnsafeZone {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "zone_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ZoneType zoneType;
    
    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal severity;
    
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;
    
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;
    
    @Column(name = "radius_meters", nullable = false)
    @Builder.Default
    private Integer radiusMeters = 100;
    
    @Column(length = 255)
    private String label;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(length = 50)
    @Builder.Default
    private String source = "ADMIN";
    
    @Column(name = "report_count")
    @Builder.Default
    private Integer reportCount = 0;
    
    @Column(precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal confidence = BigDecimal.ONE;
    
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
    
    @Column(name = "valid_from")
    private LocalTime validFrom;
    
    @Column(name = "valid_to")
    private LocalTime validTo;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    
    public enum ZoneType {
        CRIME_HOTSPOT,
        HARASSMENT,
        THEFT,
        POOR_LIGHTING,
        UNSAFE_ROAD,
        ISOLATED
    }
}
