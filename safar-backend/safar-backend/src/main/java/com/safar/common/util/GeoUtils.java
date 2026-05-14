package com.safar.common.util;

public class GeoUtils {
    
    private static final double EARTH_RADIUS_METERS = 6371000;
    
    /**
     * Calculate distance between two points using Haversine formula
     */
    public static double distanceInMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS_METERS * c;
    }
    
    /**
     * Check if a point is within radius of another point
     */
    public static boolean isWithinRadius(double lat1, double lng1, 
                                          double lat2, double lng2, 
                                          double radiusMeters) {
        return distanceInMeters(lat1, lng1, lat2, lng2) <= radiusMeters;
    }
    
    /**
     * Create PostGIS POINT string from coordinates
     */
    public static String toPointWKT(double lat, double lng) {
        return String.format("POINT(%f %f)", lng, lat);
    }
}
