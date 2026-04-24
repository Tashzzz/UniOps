package com.example.uniops.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.uniops.dto.BookingRequestDTO;
import com.example.uniops.exception.ResourceNotFoundException;
import com.example.uniops.model.Booking;
import com.example.uniops.model.Booking.BookingStatus;
import com.example.uniops.model.Notification;
import com.example.uniops.model.Resource;
import com.example.uniops.model.user;
import com.example.uniops.repository.BookingRepository;
import com.example.uniops.repository.ResourceRepository;
import com.example.uniops.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public List<Booking> getAllBookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc();
    }

    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));
    }

    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Booking> getBookingsByResource(Long resourceId) {
        return bookingRepository.findByResourceId(resourceId);
    }

    public Booking createBooking(BookingRequestDTO dto) {
        // Validate times
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        Resource resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + dto.getResourceId()));

        user user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));

        // Check for conflicts
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                dto.getResourceId(), dto.getStartTime(), dto.getEndTime());
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("This resource is already booked for the selected time slot.");
        }

        Booking booking = Booking.builder()
                .resource(resource)
                .user(user)
                .title(dto.getTitle())
                .purpose(dto.getTitle())
            .userEmail(user.getEmail())
                .userName(user.getName())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .notes(dto.getNotes())
                .status(BookingStatus.PENDING)
                .build();

        Booking saved = bookingRepository.save(booking);

        // Send notification
        notificationService.createNotification(user,
                "Booking Submitted",
                "Your booking for '" + resource.getName() + "' is pending approval.",
                Notification.NotificationType.BOOKING,
                saved.getId());

        return saved;
    }

    public Booking updateBookingStatus(Long id, BookingStatus status) {
        Booking booking = getBookingById(id);
        booking.setStatus(status);
        Booking updated = bookingRepository.save(booking);

        // Notify user of status change
        String msg = "Your booking for '" + booking.getResource().getName() + "' has been " + status.name().toLowerCase() + ".";
        notificationService.createNotification(booking.getUser(),
                "Booking " + status.name(),
                msg,
                Notification.NotificationType.BOOKING,
                id);

        return updated;
    }

    public void deleteBooking(Long id) {
        Booking booking = getBookingById(id);
        bookingRepository.delete(booking);
    }
}
