package com.example.uniops.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.dao.DataAccessException;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.uniops.dto.ResourceUsageAnalyticsResponse;
import com.example.uniops.exception.ResourceNotFoundException;
import com.example.uniops.model.Resource;
import com.example.uniops.model.Resource.ResourceStatus;
import com.example.uniops.model.Resource.ResourceType;
import com.example.uniops.repository.BookingRepository;
import com.example.uniops.repository.ResourceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final BookingRepository bookingRepository;
    private final JdbcTemplate jdbcTemplate;

    public List<Resource> getAllResources() {
        return resourceRepository.findAll();
    }

    public List<Resource> getResources(
            ResourceStatus status,
            ResourceType type,
            String location,
            Integer minCapacity,
            Integer maxCapacity,
            String search) {

        Specification<Resource> spec = (root, query, cb) -> cb.conjunction();

        if (status != null) {
            spec = spec.and((root, query, cb) -> {
                if (status == ResourceStatus.ACTIVE) {
                    return cb.or(
                            cb.equal(root.get("status"), ResourceStatus.ACTIVE),
                            cb.equal(root.get("status"), ResourceStatus.AVAILABLE));
                }
                return cb.equal(root.get("status"), status);
            });
        }
        if (type != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("type"), type));
        }
        if (location != null && !location.isBlank()) {
            String like = "%" + location.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("location")), like));
        }
        if (minCapacity != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("capacity"), minCapacity));
        }
        if (maxCapacity != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("capacity"), maxCapacity));
        }
        if (search != null && !search.isBlank()) {
            String like = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("location")), like),
                    cb.like(cb.lower(cb.coalesce(root.get("description"), "")), like)));
        }

        return resourceRepository.findAll(spec);
    }

    public Resource getResourceById(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
    }

    public List<Resource> getAvailableResources() {
        return getResources(ResourceStatus.ACTIVE, null, null, null, null, null);
    }

    public List<Resource> getResourcesByType(ResourceType type) {
        return resourceRepository.findByType(type);
    }

    public List<Resource> getAvailableResources(LocalDateTime startTime, LocalDateTime endTime, ResourceType type,
            Integer minCapacity) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("startTime and endTime are required.");
        }
        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("endTime must be after startTime.");
        }

        Specification<Resource> spec = (root, query, cb) -> cb.or(
                cb.equal(root.get("status"), ResourceStatus.ACTIVE),
                cb.equal(root.get("status"), ResourceStatus.AVAILABLE));

        if (type != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("type"), type));
        }

        if (minCapacity != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("capacity"), minCapacity));
        }

        List<Long> bookedResourceIds = bookingRepository.findBookedResourceIdsInWindow(startTime, endTime);
        if (bookedResourceIds != null && !bookedResourceIds.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.not(root.get("id").in(bookedResourceIds)));
        }

        return resourceRepository.findAll(spec);
    }

    public List<Resource> searchResources(String name) {
        return resourceRepository.findByNameContainingIgnoreCase(name);
    }

    public Resource createResource(Resource resource) {
        normalizeAndValidate(resource);
        if (resource.getStatus() == null) {
            resource.setStatus(ResourceStatus.ACTIVE);
        }
        return resourceRepository.save(resource);
    }

    public Resource updateResource(Long id, Resource updatedResource) {
        normalizeAndValidate(updatedResource);
        Resource existing = getResourceById(id);
        existing.setName(updatedResource.getName());
        existing.setType(updatedResource.getType());
        existing.setLocation(updatedResource.getLocation());
        existing.setCapacity(updatedResource.getCapacity());
        existing.setStatus(updatedResource.getStatus());
        existing.setDescription(updatedResource.getDescription());
        existing.setAvailableFrom(updatedResource.getAvailableFrom());
        existing.setAvailableTo(updatedResource.getAvailableTo());
        existing.setAvailableDays(updatedResource.getAvailableDays());
        existing.setImageUrl(updatedResource.getImageUrl());
        return resourceRepository.save(existing);
    }

    public Resource updateStatus(Long id, ResourceStatus status) {
        Resource resource = getResourceById(id);
        resource.setStatus(status);
        return resourceRepository.save(resource);
    }

    public void deleteResource(Long id) {
        Resource resource = getResourceById(id);
        resourceRepository.delete(resource);
    }

    @Transactional(readOnly = true)
    public ResourceUsageAnalyticsResponse getUsageAnalytics(int days) {
        int boundedDays = Math.max(1, Math.min(days, 365));
        LocalDateTime cutoff = LocalDateTime.now().minusDays(boundedDays);

        List<ResourceUsageAnalyticsResponse.TopResourceUsage> topResources = getTopResources(cutoff);
        List<ResourceUsageAnalyticsResponse.PeakBookingHour> peakHours = getPeakBookingHours(cutoff);

        return ResourceUsageAnalyticsResponse.builder()
                .analysisWindowDays(boundedDays)
                .generatedAt(LocalDateTime.now())
                .topResources(topResources)
                .peakBookingHours(peakHours)
                .build();
    }

    private List<ResourceUsageAnalyticsResponse.TopResourceUsage> getTopResources(LocalDateTime cutoff) {
        String sql = """
                SELECT r.id AS resource_id,
                       r.name AS resource_name,
                       r.type AS resource_type,
                       r.location AS location,
                       COUNT(b.id) AS total_bookings,
                       COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)) / 60.0, 0) AS total_booked_hours
                FROM resources r
                LEFT JOIN bookings b
                    ON b.resource_id = r.id
                    AND b.status = 'APPROVED'
                    AND b.start_time >= ?
                GROUP BY r.id, r.name, r.type, r.location
                ORDER BY total_bookings DESC, total_booked_hours DESC, r.name ASC
                LIMIT 5
                """;

        try {
            return jdbcTemplate.query(sql, (rs, rowNum) -> ResourceUsageAnalyticsResponse.TopResourceUsage.builder()
                    .resourceId(rs.getLong("resource_id"))
                    .resourceName(rs.getString("resource_name"))
                    .resourceType(rs.getString("resource_type"))
                    .location(rs.getString("location"))
                    .totalBookings(rs.getLong("total_bookings"))
                    .totalBookedHours(rs.getDouble("total_booked_hours"))
                    .build(), cutoff);
        } catch (DataAccessException ex) {
            return List.of();
        }
    }

    private List<ResourceUsageAnalyticsResponse.PeakBookingHour> getPeakBookingHours(LocalDateTime cutoff) {
        String sql = """
                SELECT HOUR(b.start_time) AS hour_of_day,
                       COUNT(*) AS bookings
                FROM bookings b
                WHERE b.status = 'APPROVED'
                  AND b.start_time >= ?
                GROUP BY HOUR(b.start_time)
                ORDER BY bookings DESC, hour_of_day ASC
                LIMIT 6
                """;

        try {
            return jdbcTemplate.query(sql, (rs, rowNum) -> ResourceUsageAnalyticsResponse.PeakBookingHour.builder()
                    .hourOfDay(rs.getInt("hour_of_day"))
                    .bookings(rs.getLong("bookings"))
                    .build(), cutoff);
        } catch (DataAccessException ex) {
            return List.of();
        }
    }

    private void normalizeAndValidate(Resource resource) {
        if (resource.getName() != null) {
            resource.setName(resource.getName().trim());
        }
        if (resource.getLocation() != null) {
            resource.setLocation(resource.getLocation().trim());
        }
        if (resource.getDescription() != null) {
            resource.setDescription(resource.getDescription().trim());
        }

        if (resource.getStatus() == ResourceStatus.AVAILABLE) {
            resource.setStatus(ResourceStatus.ACTIVE);
        }

        if (resource.getAvailableDays() == null) {
            resource.setAvailableDays(Resource.AvailabilityDays.ALL_DAYS);
        }

        if (resource.getAvailableFrom() != null
                && resource.getAvailableTo() != null
                && !resource.getAvailableFrom().isBefore(resource.getAvailableTo())) {
            throw new IllegalArgumentException("Availability window is invalid: availableFrom must be before availableTo.");
        }

        if (resource.getCapacity() < 1) {
            throw new IllegalArgumentException("Capacity must be at least 1.");
        }
    }
}