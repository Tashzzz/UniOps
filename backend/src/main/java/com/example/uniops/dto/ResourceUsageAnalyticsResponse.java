package com.example.uniops.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceUsageAnalyticsResponse {

    private int analysisWindowDays;
    private LocalDateTime generatedAt;
    private List<TopResourceUsage> topResources;
    private List<PeakBookingHour> peakBookingHours;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopResourceUsage {
        private Long resourceId;
        private String resourceName;
        private String resourceType;
        private String location;
        private long totalBookings;
        private double totalBookedHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeakBookingHour {
        private int hourOfDay;
        private long bookings;
    }
}
