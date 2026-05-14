package com.safar.maps;

import com.safar.maps.dto.OverpassResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class OverpassClient {

    private final WebClient webClient;
    private static final String OVERPASS_URL = "https://overpass-api.de/api/interpreter";

    public Mono<Integer> getStreetLampCount(double lat, double lng, int radiusMeters) {
        String query = String.format(
                "[out:json];node[\"highway\"=\"street_lamp\"](around:%d,%f,%f);out count;",
                radiusMeters, lat, lng
        );
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);

        log.debug("Querying Overpass API for street lamps near ({}, {}), radius={}m", lat, lng, radiusMeters);

        return webClient.get()
                .uri(OVERPASS_URL + "?data=" + encodedQuery)
                .retrieve()
                .bodyToMono(OverpassResponse.class)
                .timeout(Duration.ofSeconds(10))
                .map(response -> {
                    int count = response.getCount();
                    log.debug("Found {} street lamps near ({}, {})", count, lat, lng);
                    return count;
                })
                .onErrorResume(error -> {
                    log.warn("Overpass API error for ({}, {}): {}", lat, lng, error.getMessage());
                    return Mono.just(-1);
                });
    }

    public Mono<Integer> getCctvCount(double lat, double lng, int radiusMeters) {
        String query = String.format(
                "[out:json];node[\"man_made\"=\"surveillance\"](around:%d,%f,%f);out count;",
                radiusMeters, lat, lng
        );
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);

        return webClient.get()
                .uri(OVERPASS_URL + "?data=" + encodedQuery)
                .retrieve()
                .bodyToMono(OverpassResponse.class)
                .timeout(Duration.ofSeconds(10))
                .map(OverpassResponse::getCount)
                .onErrorResume(error -> {
                    log.warn("Overpass API CCTV error: {}", error.getMessage());
                    return Mono.just(-1);
                });
    }

    public Mono<Integer> getPoliceStationCount(double lat, double lng, int radiusMeters) {
        String query = String.format(
                "[out:json];node[\"amenity\"=\"police\"](around:%d,%f,%f);out count;",
                radiusMeters, lat, lng
        );
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);

        return webClient.get()
                .uri(OVERPASS_URL + "?data=" + encodedQuery)
                .retrieve()
                .bodyToMono(OverpassResponse.class)
                .timeout(Duration.ofSeconds(10))
                .map(OverpassResponse::getCount)
                .onErrorResume(error -> {
                    log.warn("Overpass API police station error: {}", error.getMessage());
                    return Mono.just(-1);
                });
    }
}
