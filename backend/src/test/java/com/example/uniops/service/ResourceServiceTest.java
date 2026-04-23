package com.example.uniops.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import com.example.uniops.dto.ResourceUsageAnalyticsResponse;
import com.example.uniops.model.Resource;
import com.example.uniops.model.Resource.ResourceStatus;
import com.example.uniops.model.Resource.ResourceType;
import com.example.uniops.repository.ResourceRepository;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

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
        when(jdbcTemplate.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class), any()))
                .thenThrow(new DataAccessResourceFailureException("bookings table unavailable"));

        ResourceUsageAnalyticsResponse response = resourceService.getUsageAnalytics(999);

        assertEquals(365, response.getAnalysisWindowDays());
        assertNotNull(response.getGeneratedAt());
        assertNotNull(response.getTopResources());
        assertNotNull(response.getPeakBookingHours());
        assertTrue(response.getTopResources().isEmpty());
        assertTrue(response.getPeakBookingHours().isEmpty());
    }
}
