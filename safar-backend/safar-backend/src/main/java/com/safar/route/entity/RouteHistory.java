package com.safar.route.entity;

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
@Table(name = "route_history")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @Column(name = "origin_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal originLat;
    
    @Column(name = "origin_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal originLng;
    
    @Column(name = "dest_lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal destLat;
    
    @Column(name = "dest_lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal destLng;
    
    @Column(name = "origin_address", length = 500)
    private String originAddress;
    
    @Column(name = "dest_address", length = 500)
    private String destAddress;
    
    @Column(name = "selected_route", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String selectedRoute;
    
    @Column(name = "all_routes", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String allRoutes;
    
    @Column(name = "safety_score", precision = 4, scale = 3)
    private BigDecimal safetyScore;
    
    @Column(name = "was_recommended")
    @Builder.Default
    private Boolean wasRecommended = false;
    
    @Column(name = "travel_mode", length = 20)
    @Builder.Default
    private String travelMode = "WALKING";
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
