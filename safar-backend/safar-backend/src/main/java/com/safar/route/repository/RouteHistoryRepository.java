package com.safar.route.repository;

import com.safar.route.entity.RouteHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RouteHistoryRepository extends JpaRepository<RouteHistory, UUID> {
    
    Page<RouteHistory> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
