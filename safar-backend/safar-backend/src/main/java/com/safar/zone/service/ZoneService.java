package com.safar.zone.service;

import com.safar.common.exception.SafarException;
import com.safar.zone.dto.ZoneDTO;
import com.safar.zone.dto.ZoneRequest;
import com.safar.zone.entity.UnsafeZone;
import com.safar.zone.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ZoneService {
    
    private final ZoneRepository zoneRepository;
    
    @Cacheable(value = "zones", key = "#minLat + '-' + #maxLat + '-' + #minLng + '-' + #maxLng")
    public List<ZoneDTO> getZonesByBoundingBox(double minLat, double maxLat, 
                                                double minLng, double maxLng) {
        List<UnsafeZone> zones = zoneRepository.findByBoundingBox(
                BigDecimal.valueOf(minLat),
                BigDecimal.valueOf(maxLat),
                BigDecimal.valueOf(minLng),
                BigDecimal.valueOf(maxLng)
        );
        
        return zones.stream()
                .map(ZoneDTO::from)
                .collect(Collectors.toList());
    }
    
    public List<ZoneDTO> getZonesNearPoint(double lat, double lng, double radiusMeters) {
        double latBuffer = radiusMeters / 111000.0;
        double lngBuffer = radiusMeters / (111000.0 * Math.cos(Math.toRadians(lat)));
        
        List<UnsafeZone> zones = zoneRepository.findByBoundingBox(
                BigDecimal.valueOf(lat - latBuffer),
                BigDecimal.valueOf(lat + latBuffer),
                BigDecimal.valueOf(lng - lngBuffer),
                BigDecimal.valueOf(lng + lngBuffer)
        );
        
        return zones.stream()
                .map(ZoneDTO::from)
                .collect(Collectors.toList());
    }
    
    public List<ZoneDTO> getAllActiveZones() {
        return zoneRepository.findByIsActiveTrue()
                .stream()
                .map(ZoneDTO::from)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public ZoneDTO createZone(ZoneRequest request) {
        UnsafeZone zone = UnsafeZone.builder()
                .zoneType(request.getType())
                .severity(request.getSeverity())
                .latitude(BigDecimal.valueOf(request.getLat()))
                .longitude(BigDecimal.valueOf(request.getLng()))
                .radiusMeters(request.getRadiusMeters())
                .label(request.getLabel())
                .description(request.getDescription())
                .source("ADMIN")
                .isActive(true)
                .build();
        
        zone = zoneRepository.save(zone);
        log.info("Created new unsafe zone: {} at ({}, {})", 
                zone.getZoneType(), zone.getLatitude(), zone.getLongitude());
        
        return ZoneDTO.from(zone);
    }
    
    @Transactional
    public ZoneDTO updateZone(UUID id, ZoneRequest request) {
        UnsafeZone zone = zoneRepository.findById(id)
                .orElseThrow(() -> SafarException.notFound("ZONE_NOT_FOUND", "Zone not found"));
        
        zone.setZoneType(request.getType());
        zone.setSeverity(request.getSeverity());
        zone.setLatitude(BigDecimal.valueOf(request.getLat()));
        zone.setLongitude(BigDecimal.valueOf(request.getLng()));
        zone.setRadiusMeters(request.getRadiusMeters());
        zone.setLabel(request.getLabel());
        zone.setDescription(request.getDescription());
        
        zone = zoneRepository.save(zone);
        return ZoneDTO.from(zone);
    }
    
    @Transactional
    public void deleteZone(UUID id) {
        UnsafeZone zone = zoneRepository.findById(id)
                .orElseThrow(() -> SafarException.notFound("ZONE_NOT_FOUND", "Zone not found"));
        
        zone.setIsActive(false);
        zoneRepository.save(zone);
        log.info("Deactivated unsafe zone: {}", id);
    }
    
    @Transactional
    public void incrementReportCount(UUID zoneId) {
        UnsafeZone zone = zoneRepository.findById(zoneId).orElse(null);
        if (zone != null) {
            zone.setReportCount(zone.getReportCount() + 1);
            zoneRepository.save(zone);
        }
    }
}
