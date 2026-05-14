package com.safar.route.controller;

import com.safar.common.dto.ApiResponse;
import com.safar.common.dto.PageResponse;
import com.safar.route.dto.RouteAnalysisRequest;
import com.safar.route.dto.RouteAnalysisResponse;
import com.safar.route.dto.RouteHistoryDTO;
import com.safar.route.service.RouteService;
import com.safar.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/routes")
@RequiredArgsConstructor
public class RouteController {
    
    private final RouteService routeService;
    
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<RouteAnalysisResponse>> analyzeRoutes(
            @Valid @RequestBody RouteAnalysisRequest request,
            @AuthenticationPrincipal User user) {
        
        RouteAnalysisResponse response = routeService.analyzeRoutes(request, user);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PageResponse<RouteHistoryDTO>>> getHistory(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        PageResponse<RouteHistoryDTO> history = routeService.getRouteHistory(
                user.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(history));
    }
}
