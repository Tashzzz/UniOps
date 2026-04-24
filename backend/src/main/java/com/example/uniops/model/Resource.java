package com.example.uniops.model;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Resource name is required")
    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Resource type is required")
    @Column(nullable = false)
    private ResourceType type;

    @NotBlank(message = "Location is required")
    @Column(nullable = false)
    private String location;

    @Min(value = 1, message = "Capacity must be at least 1")
    @Column(nullable = false)
    private int capacity;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Resource status is required")
    @Column(nullable = false)
    @Builder.Default
    private ResourceStatus status = ResourceStatus.ACTIVE;

    @Column(name = "available_from")
    private LocalTime availableFrom;

    @Column(name = "available_to")
    private LocalTime availableTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "available_days", nullable = false)
    @Builder.Default
    private AvailabilityDays availableDays = AvailabilityDays.ALL_DAYS;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ResourceType {
        LECTURE_HALL, LAB, MEETING_ROOM, SPORTS, STUDY_ROOM, AUDITORIUM, OTHER;

        @JsonCreator
        public static ResourceType fromValue(String value) {
            if (value == null || value.isBlank()) {
                return null;
            }
            String normalized = value.trim()
                    .toUpperCase(Locale.ROOT)
                    .replace('-', '_')
                    .replace(' ', '_');
            return ResourceType.valueOf(normalized);
        }
    }

    public enum ResourceStatus {
        ACTIVE, OUT_OF_SERVICE,
        AVAILABLE, OCCUPIED, MAINTENANCE, RETIRED;

        @JsonCreator
        public static ResourceStatus fromValue(String value) {
            if (value == null || value.isBlank()) {
                return null;
            }
            String normalized = value.trim()
                    .toUpperCase(Locale.ROOT)
                    .replace('-', '_')
                    .replace(' ', '_');
            return ResourceStatus.valueOf(normalized);
        }
    }

    public enum AvailabilityDays {
        ALL_DAYS,
        WEEKDAYS,
        WEEKENDS,
        MONDAY,
        TUESDAY,
        WEDNESDAY,
        THURSDAY,
        FRIDAY,
        SATURDAY,
        SUNDAY;

        @JsonCreator
        public static AvailabilityDays fromValue(String value) {
            if (value == null || value.isBlank()) {
                return null;
            }
            String normalized = value.trim()
                    .toUpperCase(Locale.ROOT)
                    .replace('-', '_')
                    .replace(' ', '_');
            return AvailabilityDays.valueOf(normalized);
        }
    }
}
