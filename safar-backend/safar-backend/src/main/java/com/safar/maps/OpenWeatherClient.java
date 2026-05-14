package com.safar.maps;

import com.safar.maps.dto.WeatherResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenWeatherClient {

    private final WebClient webClient;

    @Value("${app.maps.weather-api-key:}")
    private String apiKey;

    private static final String BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

    public Mono<WeatherResponse> getWeather(double lat, double lng) {
        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-weather-api-key-here")) {
            log.debug("No weather API key configured. Returning default clear weather.");
            return Mono.just(createDefaultWeather());
        }

        String url = String.format("%s?lat=%f&lon=%f&appid=%s&units=metric", BASE_URL, lat, lng, apiKey);

        log.debug("Fetching weather for ({}, {})", lat, lng);

        return webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(WeatherResponse.class)
                .timeout(Duration.ofSeconds(10))
                .doOnNext(weather -> log.debug("Weather at ({}, {}): visibility={}m, condition={}",
                        lat, lng, weather.getVisibility(), weather.getPrimaryCondition()))
                .onErrorResume(error -> {
                    log.warn("Weather API error for ({}, {}): {}", lat, lng, error.getMessage());
                    return Mono.just(createDefaultWeather());
                });
    }

    private WeatherResponse createDefaultWeather() {
        WeatherResponse response = new WeatherResponse();
        response.setVisibility(10000);
        response.setConditions(java.util.List.of());
        return response;
    }
}
