package com.example.uniops.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.uniops.dto.ResourceUsageAnalyticsResponse;
import com.example.uniops.model.Resource;
import com.example.uniops.model.Resource.ResourceStatus;
import com.example.uniops.model.Resource.ResourceType;
import com.example.uniops.service.ResourceService;
import com.example.uniops.util.FileUploadUtil;

@WebMvcTest(ResourceController.class)
@AutoConfigureMockMvc(addFilters = false)
class ResourceControllerTest {

    @Autowired
    private MockMvc mockMvc;

        @MockitoBean
    private ResourceService resourceService;

        @MockitoBean
    private FileUploadUtil fileUploadUtil;

    @Test
    void getAllResources_forwardsFiltersToService() throws Exception {
        Resource resource = Resource.builder()
                .id(1L)
                .name("Lab 1")
                .type(ResourceType.LAB)
                .location("Block B")
                .capacity(40)
                .status(ResourceStatus.ACTIVE)
                .build();

        when(resourceService.getResources(
                ResourceStatus.ACTIVE,
                ResourceType.LAB,
                "Block",
                20,
                60,
                "lab"))
                .thenReturn(List.of(resource));

        mockMvc.perform(get("/api/resources")
                        .param("status", "ACTIVE")
                        .param("type", "LAB")
                        .param("location", "Block")
                        .param("minCapacity", "20")
                        .param("maxCapacity", "60")
                        .param("search", "lab")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Lab 1"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));

        verify(resourceService).getResources(
                eq(ResourceStatus.ACTIVE),
                eq(ResourceType.LAB),
                eq("Block"),
                eq(20),
                eq(60),
                eq("lab"));
    }

    @Test
    void getUsageAnalytics_returnsExpectedResponseShape() throws Exception {
        ResourceUsageAnalyticsResponse response = ResourceUsageAnalyticsResponse.builder()
                .analysisWindowDays(30)
                .generatedAt(LocalDateTime.of(2026, 4, 24, 10, 0))
                .topResources(List.of(
                        ResourceUsageAnalyticsResponse.TopResourceUsage.builder()
                                .resourceId(10L)
                                .resourceName("Main Auditorium")
                                .resourceType("AUDITORIUM")
                                .location("Block A")
                                .totalBookings(12)
                                .totalBookedHours(36.5)
                                .build()))
                .peakBookingHours(List.of(
                        ResourceUsageAnalyticsResponse.PeakBookingHour.builder()
                                .hourOfDay(10)
                                .bookings(9)
                                .build()))
                .build();

        when(resourceService.getUsageAnalytics(30)).thenReturn(response);

        mockMvc.perform(get("/api/resources/analytics/usage")
                        .param("days", "30")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisWindowDays").value(30))
                .andExpect(jsonPath("$.topResources[0].resourceName").value("Main Auditorium"))
                .andExpect(jsonPath("$.topResources[0].totalBookings").value(12))
                .andExpect(jsonPath("$.peakBookingHours[0].hourOfDay").value(10))
                .andExpect(jsonPath("$.peakBookingHours[0].bookings").value(9));
    }

    @Test
    void getUsageAnalytics_usesDefaultDaysWhenRequestParamMissing() throws Exception {
        when(resourceService.getUsageAnalytics(30)).thenReturn(ResourceUsageAnalyticsResponse.builder()
                .analysisWindowDays(30)
                .generatedAt(LocalDateTime.now())
                .topResources(List.of())
                .peakBookingHours(List.of())
                .build());

        mockMvc.perform(get("/api/resources/analytics/usage"))
                .andExpect(status().isOk());

        verify(resourceService).getUsageAnalytics(30);
    }
}
