package com.safar.scoring.controller;

import com.safar.common.dto.ApiResponse;
import com.safar.scoring.RiskAnalysisService;
import com.safar.scoring.dto.RiskScoreRequest;
import com.safar.scoring.dto.RiskScoreResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/safety")
@RequiredArgsConstructor
public class SafetyScoreController {

    private final RiskAnalysisService riskAnalysisService;

    @PostMapping("/score")
    public Mono<ResponseEntity<ApiResponse<RiskScoreResponse>>> getScore(
            @Valid @RequestBody RiskScoreRequest request) {

        return riskAnalysisService.analyzeLocation(request.getLat(), request.getLng())
                .map(result -> ResponseEntity.ok(ApiResponse.success(result)));
    }
}
