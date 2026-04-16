package com.example.uniops.service;

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
        return ticketRepository.save(ticket);
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException("Ticket not found with id: " + id));
    }

    public Ticket uploadAttachment(Long id, MultipartFile file) throws java.io.IOException {
        Ticket ticket = getTicketById(id);
        String fileName = fileUploadUtil.saveFile("tickets", file);
        ticket.setAttachmentUrl("/uploads/tickets/" + fileName);
        return ticketRepository.save(ticket);
    }
}
