package com.example.uniops.service;

import com.example.uniops.exception.ResourceNotFoundException;
import com.example.uniops.model.Notification;
import com.example.uniops.model.Notification.NotificationType;
import com.example.uniops.model.user;
import com.example.uniops.repository.NotificationRepository;
import com.example.uniops.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CurrentUserService currentUserService;

    public List<Notification> getNotificationsForUser(Long userId) {
        validateAccess(userId);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotificationsForUser(Long userId) {
        validateAccess(userId);
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        validateAccess(userId);
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(Long userId) {
        validateAccess(userId);
        notificationRepository.markAllAsReadByUserId(userId);
    }

    public Notification createNotification(user user, String title, String message,
                                            NotificationType type, Long referenceId) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .read(false)
                .build();
        return notificationRepository.save(notification);
    }

    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    private void validateAccess(Long userId) {
        user currentUser = currentUserService.getRequiredUser();
        if (!currentUserService.isAdminOrStaff(currentUser) && !currentUser.getId().equals(userId)) {
            throw new IllegalStateException("You can only access your own notifications.");
        }
    }
}
