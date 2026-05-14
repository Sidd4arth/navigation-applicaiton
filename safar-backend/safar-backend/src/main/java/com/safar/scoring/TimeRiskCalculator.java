package com.safar.scoring;

import java.time.LocalTime;

/**
 * Calculates time-based risk multipliers
 */
public class TimeRiskCalculator {
    
    public static double getTimeMultiplier(LocalTime time) {
        int hour = time.getHour();
        
        // Night time (22:00 - 05:00): highest risk
        if (hour >= 22 || hour < 5) {
            return 1.5;
        }
        
        // Dawn (05:00 - 07:00): moderate risk
        if (hour >= 5 && hour < 7) {
            return 1.2;
        }
        
        // Dusk (17:00 - 19:00): moderate risk
        if (hour >= 17 && hour < 19) {
            return 1.2;
        }
        
        // Day time (07:00 - 17:00): baseline risk
        return 1.0;
    }
    
    public static String getTimeOfDayLabel(LocalTime time) {
        int hour = time.getHour();
        
        if (hour >= 22 || hour < 5) return "NIGHT";
        if (hour >= 5 && hour < 7) return "DAWN";
        if (hour >= 7 && hour < 12) return "MORNING";
        if (hour >= 12 && hour < 17) return "AFTERNOON";
        if (hour >= 17 && hour < 19) return "DUSK";
        return "EVENING";
    }
}
