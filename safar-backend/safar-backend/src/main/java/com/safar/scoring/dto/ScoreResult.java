package com.safar.scoring.dto;

import com.safar.zone.dto.ZoneDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreResult {
    private double safetyScore;
    private double rawDangerScore;
    private double normalizedDangerScore;
    private double timeMultiplier;
    private double communityBoost;
    private List<ZoneDTO> dangerZones;
    private List<String> warnings;
}
