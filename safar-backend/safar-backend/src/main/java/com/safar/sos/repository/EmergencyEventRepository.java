package com.safar.sos.repository;

import com.safar.sos.entity.EmergencyEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmergencyEventRepository extends JpaRepository<EmergencyEvent, UUID> {
    
    Optional<EmergencyEvent> findByIdAndUserIdAndStatus(UUID id, UUID userId, 
                                                         EmergencyEvent.EventStatus status);
    
    Optional<EmergencyEvent> findByUserIdAndStatus(UUID userId, EmergencyEvent.EventStatus status);
    
    List<EmergencyEvent> findByStatus(EmergencyEvent.EventStatus status);
    
    @Query("SELECT e FROM EmergencyEvent e WHERE e.status = 'ACTIVE' AND e.expiresAt < :now")
    List<EmergencyEvent> findExpiredEvents(@Param("now") Instant now);
    
    @Modifying
    @Query("UPDATE EmergencyEvent e SET e.status = 'EXPIRED' WHERE e.status = 'ACTIVE' AND e.expiresAt < :now")
    int expireOldEvents(@Param("now") Instant now);
}
