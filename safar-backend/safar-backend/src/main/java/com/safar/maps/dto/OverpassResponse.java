package com.safar.maps.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OverpassResponse {

    @JsonProperty("elements")
    private List<Element> elements;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Element {
        private String type;
        private long id;
        private Tags tags;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Tags {
        private String total;
    }

    public int getCount() {
        if (elements == null || elements.isEmpty()) {
            return 0;
        }
        for (Element element : elements) {
            if (element.getTags() != null && element.getTags().getTotal() != null) {
                try {
                    return Integer.parseInt(element.getTags().getTotal());
                } catch (NumberFormatException e) {
                    return 0;
                }
            }
        }
        return elements.size();
    }
}
