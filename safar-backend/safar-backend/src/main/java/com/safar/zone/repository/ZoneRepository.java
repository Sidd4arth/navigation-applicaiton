package com.safar.zone.repository;

import com.safar.zone.entity.UnsafeZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ZoneRepository extends JpaRepository<UnsafeZone, UUID> {
    
    List<UnsafeZone> findByIsActiveTrue();
    
    @Query("""
        SELECT z FROM UnsafeZone z 
        WHERE z.isActive = true 
        AND z.latitude BETWEEN :minLat AND :maxLat 
        AND z.longitude BETWEEN :minLng AND :maxLng
        """)
    List<UnsafeZone> findByBoundingBox(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng
    );
    
    @Query(value = """
        SELECT * FROM unsafe_zones uz 
        WHERE uz.is_active = true 
        AND ST_DWithin(
            uz.location, 
            ST_GeogFromText(:point), 
            :radiusMeters
        )
        """, nativeQuery = true)
    List<UnsafeZone> findZonesWithinRadius(
            @Param("point") String pointWKT,
            @Param("radiusMeters") double radiusMeters
    );
    
    List<UnsafeZone> findByZoneTypeAndIsActiveTrue(UnsafeZone.ZoneType zoneType);
}
