package com.example.uniops.controller;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.uniops.dto.ResourceUsageAnalyticsResponse;
import com.example.uniops.model.Resource;
import com.example.uniops.model.Resource.ResourceStatus;
import com.example.uniops.model.Resource.ResourceType;
import com.example.uniops.service.ResourceService;
import com.example.uniops.util.FileUploadUtil;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ResourceController {

    private final ResourceService resourceService;
    private final FileUploadUtil fileUploadUtil;

    @GetMapping
    public ResponseEntity<List<Resource>> getAllResources(
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer maxCapacity,
            @RequestParam(required = false) String search) {

        return ResponseEntity.ok(resourceService.getResources(status, type, location, minCapacity, maxCapacity, search));
    }

    @GetMapping("/available")
    public ResponseEntity<List<Resource>> getAvailableResources(
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) Integer minCapacity) {
        LocalDateTime resolvedStartTime = parseDateTime(firstNonBlank(startTime, start), "startTime/start");
        LocalDateTime resolvedEndTime = parseDateTime(firstNonBlank(endTime, end), "endTime/end");
        return ResponseEntity.ok(resourceService.getAvailableResources(resolvedStartTime, resolvedEndTime, type, minCapacity));
    }

    @GetMapping("/analytics/usage")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<ResourceUsageAnalyticsResponse> getUsageAnalytics(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(resourceService.getUsageAnalytics(days));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<Resource> createResource(@Valid @RequestBody Resource resource) {
        return ResponseEntity.status(201).body(resourceService.createResource(resource));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<Resource> updateResource(
            @PathVariable Long id,
            @Valid @RequestBody Resource resource) {
        return ResponseEntity.ok(resourceService.updateResource(id, resource));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<Resource> updateStatus(
            @PathVariable Long id,
            @RequestParam ResourceStatus status) {
        return ResponseEntity.ok(resourceService.updateStatus(id, status));
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<Resource> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        String fileName = fileUploadUtil.saveFile("resources", file);
        Resource resource = resourceService.getResourceById(id);
        resource.setImageUrl("/uploads/resources/" + fileName);
        return ResponseEntity.ok(resourceService.updateResource(id, resource));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }

    private String firstNonBlank(String preferred, String fallback) {
        if (preferred != null && !preferred.isBlank()) {
            return preferred;
        }
        return fallback;
    }

    private LocalDateTime parseDateTime(String value, String paramName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(paramName + " is required and must be a valid datetime.");
        }
        List<DateTimeFormatter> formats = List.of(
                DateTimeFormatter.ISO_DATE_TIME,
                DateTimeFormatter.ISO_LOCAL_DATE_TIME,
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        for (DateTimeFormatter formatter : formats) {
            try {
                return LocalDateTime.parse(value.trim(), formatter);
            } catch (DateTimeParseException ignored) {
                // Try next format.
            }
        }
        throw new IllegalArgumentException(paramName + " must be in ISO format, e.g. 2026-04-25T09:00:00.");
    }
}