package com.safar.scoring;

import com.safar.maps.OpenWeatherClient;
import com.safar.maps.OverpassClient;
import com.safar.maps.dto.WeatherResponse;
import com.safar.report.repository.ReportRepository;
import com.safar.scoring.dto.RiskScoreResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Instant;
import java.time.LocalTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RiskAnalysisService {

    private final ReportRepository reportRepository;
    private final OverpassClient overpassClient;
    private final OpenWeatherClient weatherClient;

    public Mono<RiskScoreResponse> analyzeLocation(double lat, double lng) {
        log.info("Starting risk analysis for ({}, {})", lat, lng);
        long startTime = System.currentTimeMillis();

        Mono<Integer> incidentsMono = Mono.fromCallable(() ->
                reportRepository.countRecentIncidentsNearby(lat, lng)
        ).subscribeOn(Schedulers.boundedElastic());

        Mono<Integer> lampsMono = overpassClient.getStreetLampCount(lat, lng, 200);
        Mono<Integer> cctvMono = overpassClient.getCctvCount(lat, lng, 300);
        Mono<Integer> policeMono = overpassClient.getPoliceStationCount(lat, lng, 1000);
        Mono<WeatherResponse> weatherMono = weatherClient.getWeather(lat, lng);

        return Mono.zip(incidentsMono, lampsMono, cctvMono, policeMono, weatherMono)
                .map(tuple -> {
                    int incidents = tuple.getT1();
                    int lamps = tuple.getT2();
                    int cctv = tuple.getT3();
                    int police = tuple.getT4();
                    WeatherResponse weather = tuple.getT5();

                    RiskScoreResponse response = computeScore(lat, lng, incidents, lamps, cctv, police, weather);

                    long duration = System.currentTimeMillis() - startTime;
                    log.info("Risk analysis for ({}, {}) completed in {}ms. Score: {}",
                            lat, lng, duration, response.getSafetyScore());

                    return response;
                });
    }

    private RiskScoreResponse computeScore(double lat, double lng,
                                            int incidents, int lamps, int cctv,
                                            int police, WeatherResponse weather) {

        List<String> warnings = new ArrayList<>();

        // FACTOR 1: Incident Score
        double incidentPenalty;
        if (incidents == 0) {
            incidentPenalty = 0.0;
        } else if (incidents <= 2) {
            incidentPenalty = 0.10;
            warnings.add(incidents + " incident(s) reported nearby in the last 30 days");
        } else if (incidents <= 5) {
            incidentPenalty = 0.25;
            warnings.add(incidents + " incidents reported nearby — exercise caution");
        } else {
            incidentPenalty = 0.40;
            warnings.add("HIGH RISK: " + incidents + " incidents reported nearby recently");
        }
        double incidentScore = 1.0 - incidentPenalty;

        // FACTOR 2: Lighting Score
        double lightingPenalty;
        if (lamps < 0) {
            lightingPenalty = 0.0;
        } else if (lamps == 0) {
            lightingPenalty = 0.25;
            warnings.add("No street lamps detected — area may be dark at night");
        } else if (lamps <= 3) {
            lightingPenalty = 0.10;
            warnings.add("Limited street lighting in this area");
        } else {
            lightingPenalty = 0.0;
        }
        double lightingScore = 1.0 - lightingPenalty;

        // FACTOR 3: Weather Score
        double weatherPenalty = 0.0;
        double visibility = weather.getVisibility();
        if (visibility < 500) {
            weatherPenalty = 0.25;
            warnings.add("Very low visibility (" + (int) visibility + "m) — dangerous conditions");
        } else if (visibility < 2000) {
            weatherPenalty = 0.15;
            warnings.add("Reduced visibility (" + (int) visibility + "m) due to weather");
        } else if (visibility < 5000) {
            weatherPenalty = 0.05;
        }
        if (weather.isDangerousWeather()) {
            weatherPenalty += 0.10;
            warnings.add("Dangerous weather: " + weather.getPrimaryCondition());
        }
        double weatherScore = 1.0 - Math.min(weatherPenalty, 0.35);

        // FACTOR 4: Time Score
        LocalTime now = LocalTime.now();
        int hour = now.getHour();
        double timePenalty;
        String timeOfDay;
        if (hour >= 22 || hour < 5) {
            timePenalty = 0.25;
            timeOfDay = "NIGHT";
            warnings.add("Late night travel — higher risk period");
        } else if ((hour >= 5 && hour < 7) || (hour >= 19 && hour < 22)) {
            timePenalty = 0.10;
            timeOfDay = (hour < 7) ? "DAWN" : "DUSK";
            warnings.add("Low-light period — stay alert");
        } else {
            timePenalty = 0.0;
            timeOfDay = "DAY";
        }
        double timeScore = 1.0 - timePenalty;

        // FACTOR 5: Infrastructure Score
        double infraBonus = 0.0;
        if (cctv > 0) infraBonus += 0.05;
        if (police > 0) infraBonus += 0.10;
        double infrastructureScore = Math.min(1.0 + infraBonus, 1.0);

        // FINAL SCORE
        double finalScore = (incidentScore * 0.30)
                          + (lightingScore * 0.20)
                          + (weatherScore * 0.15)
                          + (timeScore * 0.20)
                          + (infrastructureScore * 0.15);

        finalScore = Math.min(finalScore + infraBonus, 1.0);
        finalScore = Math.max(finalScore, 0.0);
        finalScore = Math.round(finalScore * 1000.0) / 1000.0;

        RiskScoreResponse.ScoringBreakdown breakdown = RiskScoreResponse.ScoringBreakdown.builder()
                .incidentScore(Math.round(incidentScore * 100.0) / 100.0)
                .lightingScore(Math.round(lightingScore * 100.0) / 100.0)
                .weatherScore(Math.round(weatherScore * 100.0) / 100.0)
                .timeScore(Math.round(timeScore * 100.0) / 100.0)
                .infrastructureScore(Math.round(infrastructureScore * 100.0) / 100.0)
                .incidentCount(incidents)
                .streetLampCount(lamps)
                .cctvCount(cctv)
                .policeStationCount(police)
                .visibilityMeters(visibility)
                .weatherCondition(weather.getPrimaryCondition())
                .timeOfDay(timeOfDay)
                .build();

        Map<String, Object> rawData = new LinkedHashMap<>();
        rawData.put("incidents_30d", incidents);
        rawData.put("street_lamps_200m", lamps);
        rawData.put("cctv_300m", cctv);
        rawData.put("police_stations_1km", police);
        rawData.put("visibility_meters", visibility);
        rawData.put("weather", weather.getPrimaryCondition());
        rawData.put("time", timeOfDay);
        rawData.put("hour", hour);

        return RiskScoreResponse.builder()
                .safetyScore(finalScore)
                .safetyLabel(RiskScoreResponse.getLabelFromScore(finalScore))
                .safetyColor(RiskScoreResponse.getColorFromScore(finalScore))
                .analyzedAt(Instant.now())
                .lat(lat)
                .lng(lng)
                .breakdown(breakdown)
                .warnings(warnings)
                .rawData(rawData)
                .build();
    }
}
