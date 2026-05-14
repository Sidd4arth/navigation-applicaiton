package com.safar.scoring;

import com.safar.route.dto.LatLng;

import java.util.ArrayList;
import java.util.List;

/**
 * Decodes Google Maps encoded polyline format
 */
public class PolylineDecoder {
    
    public static List<LatLng> decode(String encodedPolyline) {
        List<LatLng> points = new ArrayList<>();
        int index = 0;
        int lat = 0;
        int lng = 0;
        
        while (index < encodedPolyline.length()) {
            // Decode latitude
            int shift = 0;
            int result = 0;
            int b;
            do {
                b = encodedPolyline.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            
            // Decode longitude
            shift = 0;
            result = 0;
            do {
                b = encodedPolyline.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            
            points.add(LatLng.builder()
                    .lat(lat / 1e5)
                    .lng(lng / 1e5)
                    .build());
        }
        
        return points;
    }
    
    public static String encode(List<LatLng> points) {
        StringBuilder encoded = new StringBuilder();
        int prevLat = 0;
        int prevLng = 0;
        
        for (LatLng point : points) {
            int lat = (int) Math.round(point.getLat() * 1e5);
            int lng = (int) Math.round(point.getLng() * 1e5);
            
            encoded.append(encodeValue(lat - prevLat));
            encoded.append(encodeValue(lng - prevLng));
            
            prevLat = lat;
            prevLng = lng;
        }
        
        return encoded.toString();
    }
    
    private static String encodeValue(int value) {
        StringBuilder encoded = new StringBuilder();
        int v = value < 0 ? ~(value << 1) : (value << 1);
        
        while (v >= 0x20) {
            encoded.append((char) ((0x20 | (v & 0x1f)) + 63));
            v >>= 5;
        }
        encoded.append((char) (v + 63));
        
        return encoded.toString();
    }
}
