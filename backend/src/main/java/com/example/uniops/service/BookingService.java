package com.example.uniops.service;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
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
import com.example.uniops.security.CurrentUserService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    public List<Booking> getAllBookings() {
        user currentUser = tryGetCurrentUser();
        if (currentUser != null) {
            currentUserService.requireAdminOrStaff(currentUser);
        }
        return bookingRepository.findAllByOrderByCreatedAtDesc();
    }

    public Booking getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + id));
        user currentUser = tryGetCurrentUser();
        if (currentUser != null && !currentUserService.isAdminOrStaff(currentUser) && !booking.getUser().getId().equals(currentUser.getId())) {
            throw new IllegalStateException("You can only view your own bookings.");
        }
        return booking;
    }

    public List<Booking> getBookingsByUser(Long userId) {
        user currentUser = tryGetCurrentUser();
        if (currentUser != null && !currentUserService.isAdminOrStaff(currentUser) && !currentUser.getId().equals(userId)) {
            throw new IllegalStateException("You can only view your own bookings.");
        }
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Booking> getBookingsByResource(Long resourceId) {
        user currentUser = tryGetCurrentUser();
        if (currentUser != null) {
            currentUserService.requireAdminOrStaff(currentUser);
        }
        return bookingRepository.findByResourceId(resourceId);
    }

    public Booking createBooking(BookingRequestDTO dto) {
        // Validate times
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        Resource resource = resourceRepository.findById(dto.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + dto.getResourceId()));

        user currentUser = tryGetCurrentUser();
        if (currentUser != null && !currentUserService.isAdminOrStaff(currentUser) && !currentUser.getId().equals(dto.getUserId())) {
            throw new IllegalStateException("You can only create bookings for your own account.");
        }

        user bookingUser = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + dto.getUserId()));
        validateResourceBookable(resource, dto);

        // Check for conflicts
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                dto.getResourceId(), dto.getStartTime(), dto.getEndTime());
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("This resource is already booked for the selected time slot.");
        }

        Booking booking = Booking.builder()
                .resource(resource)
                .user(bookingUser)
                .title(dto.getTitle())
                .purpose(dto.getTitle())
            .userEmail(bookingUser.getEmail())
                .userName(bookingUser.getName())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .notes(dto.getNotes())
                .status(BookingStatus.PENDING)
                .build();

        Booking saved = bookingRepository.save(booking);

        // Send notification
        notificationService.createNotification(bookingUser,
                "Booking Submitted",
                "Your booking for '" + resource.getName() + "' is pending approval.",
                Notification.NotificationType.BOOKING,
                saved.getId());

        return saved;
    }

    public Booking updateBookingStatus(Long id, BookingStatus status, String reason) {
        Booking booking = getBookingById(id);
        user currentUser = tryGetCurrentUser();
        boolean adminOrStaff = currentUser != null && currentUserService.isAdminOrStaff(currentUser);

        if (currentUser != null && (status == BookingStatus.APPROVED || status == BookingStatus.REJECTED)) {
            currentUserService.requireAdminOrStaff(currentUser);
        }

        if (status == BookingStatus.CANCELLED
            && !adminOrStaff
            && (currentUser == null || !booking.getUser().getId().equals(currentUser.getId()))) {
            throw new IllegalStateException("You can only cancel your own bookings.");
        }

        if (status == BookingStatus.REJECTED && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException("Rejection reason is required when rejecting a booking.");
        }

        if (status == BookingStatus.APPROVED) {
            validateBookingWithinResourceWindow(booking.getResource(), booking.getStartTime(), booking.getEndTime());
        }

        booking.setStatus(status);
        booking.setStatusReason(reason);
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
        user currentUser = tryGetCurrentUser();
        if (currentUser != null && !currentUserService.isAdminOrStaff(currentUser) && !booking.getUser().getId().equals(currentUser.getId())) {
            throw new IllegalStateException("You can only delete your own bookings.");
        }
        bookingRepository.delete(booking);
    }

    private user tryGetCurrentUser() {
        if (currentUserService == null) {
            return null;
        }
        try {
            return currentUserService.getRequiredUser();
        } catch (Exception ignored) {
            return null;
        }
    }

    private void validateResourceBookable(Resource resource, BookingRequestDTO dto) {
        if (resource.getStatus() == Resource.ResourceStatus.OUT_OF_SERVICE || resource.getStatus() == Resource.ResourceStatus.MAINTENANCE) {
            throw new IllegalStateException("Selected resource is currently unavailable for booking.");
        }
        validateBookingWithinResourceWindow(resource, dto.getStartTime(), dto.getEndTime());
    }

    private void validateBookingWithinResourceWindow(Resource resource, LocalDateTime startTime, LocalDateTime endTime) {
        if (!startTime.toLocalDate().equals(endTime.toLocalDate())) {
            throw new IllegalStateException("Booking must start and end on the same day.");
        }
        if (resource.getAvailableFrom() != null && startTime.toLocalTime().isBefore(resource.getAvailableFrom())) {
            throw new IllegalStateException("Requested start time is outside the resource availability window.");
        }
        if (resource.getAvailableTo() != null && endTime.toLocalTime().isAfter(resource.getAvailableTo())) {
            throw new IllegalStateException("Requested end time is outside the resource availability window.");
        }
        if (!isDayAllowed(resource.getAvailableDays(), startTime.getDayOfWeek())) {
            throw new IllegalStateException("Selected resource is not available on the requested day.");
        }
    }

    private boolean isDayAllowed(Resource.AvailabilityDays availabilityDays, DayOfWeek dayOfWeek) {
        if (availabilityDays == null || availabilityDays == Resource.AvailabilityDays.ALL_DAYS) {
            return true;
        }
        return switch (availabilityDays) {
            case WEEKDAYS -> dayOfWeek != DayOfWeek.SATURDAY && dayOfWeek != DayOfWeek.SUNDAY;
            case WEEKENDS -> dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY;
            case MONDAY -> dayOfWeek == DayOfWeek.MONDAY;
            case TUESDAY -> dayOfWeek == DayOfWeek.TUESDAY;
            case WEDNESDAY -> dayOfWeek == DayOfWeek.WEDNESDAY;
            case THURSDAY -> dayOfWeek == DayOfWeek.THURSDAY;
            case FRIDAY -> dayOfWeek == DayOfWeek.FRIDAY;
            case SATURDAY -> dayOfWeek == DayOfWeek.SATURDAY;
            case SUNDAY -> dayOfWeek == DayOfWeek.SUNDAY;
            default -> true;
        };
    }
}
