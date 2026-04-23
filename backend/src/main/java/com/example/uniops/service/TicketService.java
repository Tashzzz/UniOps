package com.example.uniops.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.uniops.exception.TicketNotFoundException;
import com.example.uniops.model.Ticket;
import com.example.uniops.model.Ticket.TicketStatus;
import com.example.uniops.repository.TicketRepository;
import com.example.uniops.util.FileUploadUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;
    private final FileUploadUtil fileUploadUtil;

    public List<Ticket> getTickets(TicketStatus status, String search) {
        boolean hasSearch = search != null && !search.isBlank();
        if (status != null && hasSearch) {
            return ticketRepository.findByStatusAndTitleContainingIgnoreCase(status, search);
        }
        if (status != null) {
            return ticketRepository.findByStatus(status);
        }
        if (hasSearch) {
            return ticketRepository.findByTitleContainingIgnoreCase(search);
        }
        return ticketRepository.findAll();
    }

    public Ticket createTicket(Ticket ticket) {
        if (ticket.getStatus() == null) {
            ticket.setStatus(TicketStatus.OPEN);
        }
        if (ticket.getCreatedAt() == null) {
            ticket.setCreatedAt(LocalDateTime.now());
        }
        return ticketRepository.save(ticket);
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException("Ticket not found with id: " + id));
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
        Ticket existing = getTicketById(id);
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
        Ticket existing = getTicketById(id);
        ticketRepository.delete(existing);
    }
}

