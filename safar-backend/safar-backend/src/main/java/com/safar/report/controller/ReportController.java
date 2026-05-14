package com.safar.report.controller;

import com.safar.common.dto.ApiResponse;
import com.safar.report.dto.ReportDTO;
import com.safar.report.dto.ReportRequest;
import com.safar.report.service.ReportService;
import com.safar.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {
    
    private final ReportService reportService;
    
    @PostMapping
    public ResponseEntity<ApiResponse<ReportDTO>> submitReport(
            @Valid @RequestBody ReportRequest request,
            @AuthenticationPrincipal User user) {
        
        ReportDTO report = reportService.submitReport(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Report submitted. Thank you for keeping your community safe.", 
                        report));
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, List<ReportDTO>>>> getReports(
            @RequestParam(required = false) Double minLat,
            @RequestParam(required = false) Double maxLat,
            @RequestParam(required = false) Double minLng,
            @RequestParam(required = false) Double maxLng) {
        
        List<ReportDTO> reports;
        
        if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
            reports = reportService.getReportsByBoundingBox(minLat, maxLat, minLng, maxLng);
        } else {
            reports = List.of();
        }
        
        return ResponseEntity.ok(ApiResponse.success(Map.of("reports", reports)));
    }
    
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<Map<String, List<ReportDTO>>>> getMyReports(
            @AuthenticationPrincipal User user) {
        
        List<ReportDTO> reports = reportService.getMyReports(user.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("reports", reports)));
    }
}
