package com.example.uniops.service;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.uniops.dto.BookingRequestDTO;
import com.example.uniops.model.Booking;
import com.example.uniops.model.Booking.BookingStatus;
import com.example.uniops.model.Notification.NotificationType;
import com.example.uniops.model.Resource;
import com.example.uniops.model.Resource.ResourceStatus;
import com.example.uniops.model.Resource.ResourceType;
import com.example.uniops.model.user;
import com.example.uniops.model.user.Role;
import com.example.uniops.repository.BookingRepository;
import com.example.uniops.repository.ResourceRepository;
import com.example.uniops.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private BookingService bookingService;

    @Test
    void createBooking_defaultsToPendingAndSendsNotification() {
        BookingRequestDTO dto = new BookingRequestDTO(
                1L,
                2L,
                "Team meeting",
                LocalDateTime.now().plusHours(2),
                LocalDateTime.now().plusHours(3),
                "Bring laptop");

        Resource resource = Resource.builder()
                .id(1L)
                .name("Meeting Room 1")
                .type(ResourceType.MEETING_ROOM)
                .location("Main Building")
                .capacity(12)
                .status(ResourceStatus.ACTIVE)
                .build();

        user student = user.builder()
                .id(2L)
                .name("Student One")
                .email("student@example.com")
                .role(Role.STUDENT)
                .build();

        when(resourceRepository.findById(1L)).thenReturn(java.util.Optional.of(resource));
        when(userRepository.findById(2L)).thenReturn(java.util.Optional.of(student));
        when(bookingRepository.findConflictingBookings(anyLong(), any(), any())).thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Booking saved = bookingService.createBooking(dto);

        assertNotNull(saved);
        assertEquals(BookingStatus.PENDING, saved.getStatus());
        assertEquals(resource, saved.getResource());
        assertEquals(student, saved.getUser());
        assertEquals("Team meeting", saved.getPurpose());
        assertEquals("student@example.com", saved.getUserEmail());
        assertEquals("Student One", saved.getUserName());
        verify(notificationService).createNotification(
                student,
                "Booking Submitted",
                "Your booking for 'Meeting Room 1' is pending approval.",
                NotificationType.BOOKING,
                null);
    }

    @Test
    void createBooking_rejectsOverlappingBookings() {
        BookingRequestDTO dto = new BookingRequestDTO(
                1L,
                2L,
                "Team meeting",
                LocalDateTime.now().plusHours(2),
                LocalDateTime.now().plusHours(3),
                null);

        when(resourceRepository.findById(1L)).thenReturn(java.util.Optional.of(Resource.builder()
                .id(1L)
                .name("Meeting Room 1")
                .type(ResourceType.MEETING_ROOM)
                .location("Main Building")
                .capacity(12)
                .status(ResourceStatus.ACTIVE)
                .build()));
        when(userRepository.findById(2L)).thenReturn(java.util.Optional.of(user.builder()
                .id(2L)
                .name("Student One")
                .email("student@example.com")
                .role(Role.STUDENT)
                .build()));
        when(bookingRepository.findConflictingBookings(anyLong(), any(), any())).thenReturn(List.of(
                Booking.builder().id(99L).build()));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> bookingService.createBooking(dto));

        assertEquals("This resource is already booked for the selected time slot.", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
        verify(notificationService, never()).createNotification(any(), anyString(), anyString(), any(), any());
    }
}