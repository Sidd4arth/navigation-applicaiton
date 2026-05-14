package com.safar.zone.controller;

import com.safar.common.dto.ApiResponse;
import com.safar.zone.dto.ZoneDTO;
import com.safar.zone.dto.ZoneRequest;
import com.safar.zone.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/zones")
@RequiredArgsConstructor
public class ZoneController {
    
    private final ZoneService zoneService;
    
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, List<ZoneDTO>>>> getZones(
            @RequestParam(required = false) Double minLat,
            @RequestParam(required = false) Double maxLat,
            @RequestParam(required = false) Double minLng,
            @RequestParam(required = false) Double maxLng) {
        
        List<ZoneDTO> zones;
        
        if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
            zones = zoneService.getZonesByBoundingBox(minLat, maxLat, minLng, maxLng);
        } else {
            zones = zoneService.getAllActiveZones();
        }
        
        return ResponseEntity.ok(ApiResponse.success(Map.of("zones", zones)));
    }
    
    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<Map<String, List<ZoneDTO>>>> getNearbyZones(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "500") double radius) {
        
        List<ZoneDTO> zones = zoneService.getZonesNearPoint(lat, lng, radius);
        return ResponseEntity.ok(ApiResponse.success(Map.of("zones", zones)));
    }
    
    @PostMapping
    public ResponseEntity<ApiResponse<ZoneDTO>> createZone(@Valid @RequestBody ZoneRequest request) {
        ZoneDTO zone = zoneService.createZone(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Zone created successfully", zone));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ZoneDTO>> updateZone(
            @PathVariable UUID id,
            @Valid @RequestBody ZoneRequest request) {
        ZoneDTO zone = zoneService.updateZone(id, request);
        return ResponseEntity.ok(ApiResponse.success("Zone updated successfully", zone));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteZone(@PathVariable UUID id) {
        zoneService.deleteZone(id);
        return ResponseEntity.ok(ApiResponse.success("Zone deleted successfully", null));
    }
}
