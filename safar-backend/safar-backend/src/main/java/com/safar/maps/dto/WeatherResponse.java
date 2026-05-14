package com.safar.maps.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WeatherResponse {

    private double visibility;

    @JsonProperty("weather")
    private List<WeatherCondition> conditions;

    @JsonProperty("main")
    private MainData mainData;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WeatherCondition {
        private int id;
        private String main;
        private String description;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MainData {
        private double temp;
        private double humidity;
    }

    public boolean isDangerousWeather() {
        if (conditions == null || conditions.isEmpty()) return false;
        for (WeatherCondition condition : conditions) {
            String main = condition.getMain().toLowerCase();
            if (main.contains("thunderstorm") || main.contains("fog") || main.contains("mist")) {
                return true;
            }
        }
        return false;
    }

    public String getPrimaryCondition() {
        if (conditions == null || conditions.isEmpty()) return "Clear";
        return conditions.get(0).getMain();
    }
}
