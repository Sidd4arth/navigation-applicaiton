package com.safar.report.service;

import com.safar.common.exception.SafarException;
import com.safar.report.dto.ReportDTO;
import com.safar.report.dto.ReportRequest;
import com.safar.report.entity.Report;
import com.safar.report.repository.ReportRepository;
import com.safar.user.entity.User;
import com.safar.zone.service.ZoneService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {
    
    private final ReportRepository reportRepository;
    private final ZoneService zoneService;
    
    private static final double DUPLICATE_RADIUS_DEGREES = 0.0005;
    private static final int DUPLICATE_WINDOW_HOURS = 1;
    
    @Transactional
    public ReportDTO submitReport(ReportRequest request, User user) {
        // Check for duplicate reports
        if (isDuplicate(request, user.getId())) {
            throw SafarException.badRequest("DUPLICATE_REPORT", 
                    "You already submitted a similar report recently");
        }
        
        Report report = Report.builder()
                .user(user)
                .category(request.getCategory())
                .description(request.getDescription())
                .latitude(BigDecimal.valueOf(request.getLat()))
                .longitude(BigDecimal.valueOf(request.getLng()))
                .status(Report.ReportStatus.PENDING)
                .occurredAt(request.getOccurredAt() != null ? 
                        request.getOccurredAt() : Instant.now())
                .build();
        
        report = reportRepository.save(report);
        log.info("New report submitted: {} at ({}, {}) by user {}", 
                report.getCategory(), report.getLatitude(), report.getLongitude(), user.getId());
        
        // Trigger async hotspot analysis
        triggerHotspotAnalysis(request.getLat(), request.getLng());
        
        return ReportDTO.from(report);
    }
    
    private boolean isDuplicate(ReportRequest request, UUID userId) {
        Instant since = Instant.now().minus(DUPLICATE_WINDOW_HOURS, ChronoUnit.HOURS);
        
        List<Report> duplicates = reportRepository.findDuplicates(
                userId,
                BigDecimal.valueOf(request.getLat() - DUPLICATE_RADIUS_DEGREES),
                BigDecimal.valueOf(request.getLat() + DUPLICATE_RADIUS_DEGREES),
                BigDecimal.valueOf(request.getLng() - DUPLICATE_RADIUS_DEGREES),
                BigDecimal.valueOf(request.getLng() + DUPLICATE_RADIUS_DEGREES),
                since
        );
        
        return !duplicates.isEmpty();
    }
    
    @Async
    public void triggerHotspotAnalysis(double lat, double lng) {
        log.debug("Triggering hotspot analysis near ({}, {})", lat, lng);
    }
    
    public List<ReportDTO> getReportsByBoundingBox(double minLat, double maxLat,
                                                    double minLng, double maxLng) {
        List<Report> reports = reportRepository.findByBoundingBox(
                BigDecimal.valueOf(minLat),
                BigDecimal.valueOf(maxLat),
                BigDecimal.valueOf(minLng),
                BigDecimal.valueOf(maxLng)
        );
        
        return reports.stream()
                .map(ReportDTO::from)
                .collect(Collectors.toList());
    }
    
    public List<ReportDTO> getMyReports(UUID userId) {
        return reportRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ReportDTO::from)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void updateReportStatus(UUID reportId, Report.ReportStatus status) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> SafarException.notFound("REPORT_NOT_FOUND", "Report not found"));
        
        report.setStatus(status);
        reportRepository.save(report);
        log.info("Report {} status updated to {}", reportId, status);
    }
}
