package com.safar.report.repository;

import com.safar.report.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {
    
    List<Report> findByStatusOrderByCreatedAtDesc(Report.ReportStatus status);
    
    @Query("""
        SELECT r FROM Report r 
        WHERE r.latitude BETWEEN :minLat AND :maxLat 
        AND r.longitude BETWEEN :minLng AND :maxLng
        AND r.status != 'REJECTED'
        ORDER BY r.createdAt DESC
        """)
    List<Report> findByBoundingBox(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng
    );
    
    @Query("""
        SELECT r FROM Report r 
        WHERE r.user.id = :userId 
        AND r.latitude BETWEEN :minLat AND :maxLat 
        AND r.longitude BETWEEN :minLng AND :maxLng
        AND r.createdAt > :since
        """)
    List<Report> findDuplicates(
            @Param("userId") UUID userId,
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("since") Instant since
    );
    
    @Query(value = """
        SELECT COUNT(*) FROM reports r 
        WHERE r.status != 'REJECTED'
        AND r.created_at > NOW() - INTERVAL '30 days'
        AND r.latitude BETWEEN (:lat - 0.0045) AND (:lat + 0.0045)
        AND r.longitude BETWEEN (:lng - 0.0045) AND (:lng + 0.0045)
        """, nativeQuery = true)
    int countRecentIncidentsNearby(
            @Param("lat") double lat,
            @Param("lng") double lng
    );
    
    @Query(value = """
        SELECT * FROM reports r 
        WHERE r.status != 'REJECTED'
        AND r.created_at > NOW() - INTERVAL '30 days'
        AND r.latitude BETWEEN (:lat - 0.0045) AND (:lat + 0.0045)
        AND r.longitude BETWEEN (:lng - 0.0045) AND (:lng + 0.0045)
        ORDER BY r.created_at DESC
        LIMIT 20
        """, nativeQuery = true)
    List<Report> findRecentIncidentsNearby(
            @Param("lat") double lat,
            @Param("lng") double lng
    );
    
    List<Report> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
