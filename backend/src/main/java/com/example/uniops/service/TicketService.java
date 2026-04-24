package com.example.uniops.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.uniops.exception.TicketNotFoundException;
import com.example.uniops.model.Comment;
import com.example.uniops.model.Notification;
import com.example.uniops.model.Ticket;
import com.example.uniops.model.Ticket.TicketStatus;
import com.example.uniops.model.user;
import com.example.uniops.repository.CommentRepository;
import com.example.uniops.repository.TicketRepository;
import com.example.uniops.repository.UserRepository;
import com.example.uniops.security.CurrentUserService;
import com.example.uniops.util.FileUploadUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final FileUploadUtil fileUploadUtil;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public List<Ticket> getTickets(TicketStatus status, String search, Long requesterId) {
        user currentUser = currentUserService.getRequiredUser();
        boolean admin = currentUserService.isAdminOrStaff(currentUser);
        if (requesterId != null) {
            if (!admin && !currentUser.getId().equals(requesterId)) {
                throw new IllegalStateException("You can only view your own tickets.");
            }
            return ticketRepository.findByRequesterIdOrderByCreatedAtDesc(requesterId);
        }
        boolean hasSearch = search != null && !search.isBlank();
        List<Ticket> tickets;
        if (status != null && hasSearch) {
            tickets = ticketRepository.findByStatusAndTitleContainingIgnoreCase(status, search);
        } else if (status != null) {
            tickets = ticketRepository.findByStatus(status);
        } else if (hasSearch) {
            tickets = ticketRepository.findByTitleContainingIgnoreCase(search);
        } else {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
        }
        if (admin) {
            return tickets;
        }
        return tickets.stream()
                .filter(ticket -> ticket.getRequester() != null && ticket.getRequester().getId().equals(currentUser.getId()))
                .toList();
    }

    public Ticket createTicket(Ticket ticket) {
        user currentUser = currentUserService.getRequiredUser();
        if (ticket.getStatus() == null) {
            ticket.setStatus(TicketStatus.OPEN);
        }
        if (ticket.getCreatedAt() == null) {
            ticket.setCreatedAt(LocalDateTime.now());
        }
        ticket.setRequester(currentUser);
        ticket.setContactEmail(currentUser.getEmail());
        return ticketRepository.save(ticket);
    }

    public Ticket getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException("Ticket not found with id: " + id));
        user currentUser = currentUserService.getRequiredUser();
        if (!currentUserService.isAdminOrStaff(currentUser)
                && (ticket.getRequester() == null || !ticket.getRequester().getId().equals(currentUser.getId()))) {
            throw new IllegalStateException("You can only access your own tickets.");
        }
        return ticket;
    }

    public Ticket uploadAttachment(Long id, MultipartFile file) throws java.io.IOException {
        Ticket ticket = getTicketById(id);
        String fileName = fileUploadUtil.saveFile("tickets", file);
        String newPath = "/uploads/tickets/" + fileName;
        String current = ticket.getAttachmentUrl();
        if (current == null || current.isBlank()) {
            ticket.setAttachmentUrl(newPath);
        } else {
            List<String> existing = new ArrayList<>();
            for (String path : current.split(",")) {
                String trimmed = path.trim();
                if (!trimmed.isEmpty()) {
                    existing.add(trimmed);
                }
            }
            if (existing.size() >= 3) {
                throw new IllegalArgumentException("You can upload up to 3 images only");
            }
            existing.add(newPath);
            ticket.setAttachmentUrl(String.join(",", existing));
        }
        return ticketRepository.save(ticket);
    }

    public Ticket uploadAttachments(Long id, List<MultipartFile> files) throws java.io.IOException {
        Ticket ticket = getTicketById(id);
        List<String> paths = new ArrayList<>();
        for (MultipartFile file : files) {
            String fileName = fileUploadUtil.saveFile("tickets", file);
            paths.add("/uploads/tickets/" + fileName);
        }
        ticket.setAttachmentUrl(String.join(",", paths));
        return ticketRepository.save(ticket);
    }

    public Ticket updateTicket(Long id, Ticket updatedTicket) {
        user currentUser = currentUserService.getRequiredUser();
        Ticket existing = getTicketById(id);
        if (!currentUserService.isAdminOrStaff(currentUser)
                && (existing.getRequester() == null || !existing.getRequester().getId().equals(currentUser.getId()))) {
            throw new IllegalStateException("You can only edit your own tickets.");
        }
        TicketStatus previousStatus = existing.getStatus();
        existing.setTitle(updatedTicket.getTitle());
        existing.setDescription(updatedTicket.getDescription());
        existing.setPriority(updatedTicket.getPriority());
        existing.setCategory(updatedTicket.getCategory());
        if (updatedTicket.getStatus() != null) {
            existing.setStatus(updatedTicket.getStatus());
            if (previousStatus == TicketStatus.OPEN
                    && updatedTicket.getStatus() == TicketStatus.IN_PROGRESS
                    && existing.getFirstResponseAt() == null) {
                existing.setFirstResponseAt(LocalDateTime.now());
            }
            if (previousStatus != TicketStatus.RESOLVED && updatedTicket.getStatus() == TicketStatus.RESOLVED) {
                existing.setResolvedAt(LocalDateTime.now());
            }
        }
        return ticketRepository.save(existing);
    }

    public void deleteTicket(Long id) {
        user currentUser = currentUserService.getRequiredUser();
        Ticket existing = getTicketById(id);
        if (!currentUserService.isAdminOrStaff(currentUser)
                && (existing.getRequester() == null || !existing.getRequester().getId().equals(currentUser.getId()))) {
            throw new IllegalStateException("You can only delete your own tickets.");
        }
        ticketRepository.delete(existing);
    }

    public Ticket assignTicket(Long ticketId, Long assigneeUserId) {
        user currentUser = currentUserService.getRequiredUser();
        currentUserService.requireAdminOrStaff(currentUser);
        Ticket ticket = getTicketById(ticketId);
        user assignee = userRepository.findById(assigneeUserId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee user not found."));
        ticket.setAssignee(assignee);
        Ticket updated = ticketRepository.save(ticket);
        if (ticket.getRequester() != null) {
            notificationService.createNotification(ticket.getRequester(), "Ticket Assigned",
                    "Your ticket '" + ticket.getTitle() + "' was assigned to " + assignee.getName() + ".",
                    Notification.NotificationType.TICKET, ticket.getId());
        }
        return updated;
    }

    public Ticket updateTicketStatus(Long ticketId, TicketStatus newStatus, String reason) {
        user currentUser = currentUserService.getRequiredUser();
        Ticket ticket = getTicketById(ticketId);
        validateStatusTransition(currentUser, ticket, newStatus, reason);

        TicketStatus previousStatus = ticket.getStatus();
        ticket.setStatus(newStatus);
        if (newStatus == TicketStatus.REJECTED) {
            ticket.setRejectionReason(reason);
        }
        if (newStatus == TicketStatus.IN_PROGRESS && ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(LocalDateTime.now());
        }
        if (previousStatus != TicketStatus.RESOLVED && newStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        Ticket updated = ticketRepository.save(ticket);
        if (ticket.getRequester() != null) {
            notificationService.createNotification(ticket.getRequester(), "Ticket Status Updated",
                    "Your ticket '" + ticket.getTitle() + "' is now " + newStatus.name() + ".",
                    Notification.NotificationType.TICKET, ticket.getId());
        }
        return updated;
    }

    public Ticket updateResolutionNotes(Long ticketId, String resolutionNotes) {
        user currentUser = currentUserService.getRequiredUser();
        if (!currentUserService.isOperationsStaff(currentUser)) {
            throw new IllegalStateException("Only staff/admin/technician can add resolution notes.");
        }
        Ticket ticket = getTicketById(ticketId);
        ticket.setResolutionNotes(resolutionNotes);
        return ticketRepository.save(ticket);
    }

    public List<Comment> getComments(Long ticketId) {
        getTicketById(ticketId);
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    public Comment addComment(Long ticketId, String content) {
        user currentUser = currentUserService.getRequiredUser();
        Ticket ticket = getTicketById(ticketId);
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Comment content is required.");
        }
        Comment comment = commentRepository.save(Comment.builder()
                .ticket(ticket)
                .user(currentUser)
                .content(content.trim())
                .build());
        if (ticket.getRequester() != null && !ticket.getRequester().getId().equals(currentUser.getId())) {
            notificationService.createNotification(ticket.getRequester(), "New Ticket Comment",
                    "A new comment was added to ticket '" + ticket.getTitle() + "'.",
                    Notification.NotificationType.TICKET, ticket.getId());
        }
        return comment;
    }

    public Comment updateComment(Long commentId, String content) {
        user currentUser = currentUserService.getRequiredUser();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found."));
        boolean owner = comment.getUser().getId().equals(currentUser.getId());
        if (!owner && !currentUserService.isAdminOrStaff(currentUser)) {
            throw new IllegalStateException("You can only edit your own comments.");
        }
        comment.setContent(content);
        return commentRepository.save(comment);
    }

    public void deleteComment(Long commentId) {
        user currentUser = currentUserService.getRequiredUser();
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found."));
        boolean owner = comment.getUser().getId().equals(currentUser.getId());
        if (!owner && !currentUserService.isAdminOrStaff(currentUser)) {
            throw new IllegalStateException("You can only delete your own comments.");
        }
        commentRepository.delete(comment);
    }

    private void validateStatusTransition(user currentUser, Ticket ticket, TicketStatus newStatus, String reason) {
        TicketStatus currentStatus = ticket.getStatus();
        boolean admin = currentUserService.isAdminOrStaff(currentUser);
        boolean operations = currentUserService.isOperationsStaff(currentUser);

        if (!operations && (ticket.getRequester() == null || !ticket.getRequester().getId().equals(currentUser.getId()))) {
            throw new IllegalStateException("Only the ticket owner can manage this ticket.");
        }
        if (newStatus == TicketStatus.REJECTED && !admin) {
            throw new IllegalStateException("Only admin/staff can reject tickets.");
        }
        if (newStatus == TicketStatus.REJECTED && (reason == null || reason.isBlank())) {
            throw new IllegalArgumentException("Rejection reason is required.");
        }
        boolean valid = switch (currentStatus) {
            case OPEN -> newStatus == TicketStatus.IN_PROGRESS || newStatus == TicketStatus.REJECTED;
            case IN_PROGRESS -> newStatus == TicketStatus.RESOLVED || newStatus == TicketStatus.REJECTED;
            case RESOLVED -> newStatus == TicketStatus.CLOSED || newStatus == TicketStatus.IN_PROGRESS;
            case CLOSED, REJECTED -> false;
        };
        if (!valid && currentStatus != newStatus) {
            throw new IllegalStateException("Invalid ticket status transition from " + currentStatus + " to " + newStatus + ".");
        }
    }
}

