package com.example.uniops.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import com.example.uniops.dto.ResourceUsageAnalyticsResponse;
import com.example.uniops.model.Resource;
import com.example.uniops.model.Resource.ResourceStatus;
import com.example.uniops.model.Resource.ResourceType;
import com.example.uniops.repository.BookingRepository;
import com.example.uniops.repository.ResourceRepository;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private ResourceService resourceService;

    @Test
    void createResource_trimsFieldsAndDefaultsStatusToActive() {
        Resource input = Resource.builder()
                .name("  Lecture Hall A  ")
                .type(ResourceType.LECTURE_HALL)
                .location("  Block A  ")
                .capacity(120)
                .description("  Large hall for first-year classes  ")
                .build();

        when(resourceRepository.save(any(Resource.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Resource saved = resourceService.createResource(input);

        assertEquals("Lecture Hall A", saved.getName());
        assertEquals("Block A", saved.getLocation());
        assertEquals("Large hall for first-year classes", saved.getDescription());
        assertEquals(ResourceStatus.ACTIVE, saved.getStatus());
    }

    @Test
    void getUsageAnalytics_limitsDaysAndReturnsSafeEmptyListsOnDataFailure() {
        when(jdbcTemplate.query(anyString(), ArgumentMatchers.<RowMapper<Object>>any(), any(Object[].class)))
                .thenThrow(new DataAccessResourceFailureException("bookings table unavailable"));

        ResourceUsageAnalyticsResponse response = resourceService.getUsageAnalytics(999);

        assertEquals(365, response.getAnalysisWindowDays());
        assertNotNull(response.getGeneratedAt());
        assertNotNull(response.getTopResources());
        assertNotNull(response.getPeakBookingHours());
        assertTrue(response.getTopResources().isEmpty());
        assertTrue(response.getPeakBookingHours().isEmpty());
    }

    @Test
    void getAvailableResources_excludesBookedResourcesAndAppliesFilters() {
        Resource available = Resource.builder()
                .id(2L)
                .name("Seminar Room")
                .type(ResourceType.MEETING_ROOM)
                .location("Block D")
                .capacity(30)
                .status(ResourceStatus.ACTIVE)
                .build();

        when(bookingRepository.findBookedResourceIdsInWindow(any(), any()))
                .thenReturn(List.of(1L));
        when(resourceRepository.findAll(ArgumentMatchers.<Specification<Resource>>any()))
                .thenReturn(List.of(available));

        List<Resource> results = resourceService.getAvailableResources(
                java.time.LocalDateTime.of(2026, 4, 25, 10, 0),
                java.time.LocalDateTime.of(2026, 4, 25, 12, 0),
                ResourceType.MEETING_ROOM,
                20);

        assertEquals(1, results.size());
        assertEquals(2L, results.get(0).getId());
    }
}
