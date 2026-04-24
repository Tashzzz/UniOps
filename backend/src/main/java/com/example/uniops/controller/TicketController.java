package com.example.uniops.controller;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.uniops.model.Ticket;
import com.example.uniops.model.Ticket.TicketStatus;
import com.example.uniops.model.Comment;
import com.example.uniops.service.TicketService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class TicketController {

    private final TicketService ticketService;

    @GetMapping
    public ResponseEntity<List<Ticket>> getTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long requesterId) {
        return ResponseEntity.ok(ticketService.getTickets(status, search, requesterId));
    }

    @PostMapping
    public ResponseEntity<Ticket> createTicket(@Valid @RequestBody Ticket ticket) {
        if (ticket.getStatus() == null) {
            ticket.setStatus(TicketStatus.OPEN);
        }
        return ResponseEntity.status(201).body(ticketService.createTicket(ticket));
    }

    @PutMapping({"/{id}", "/{id}/"})
    public ResponseEntity<Ticket> updateTicket(@PathVariable Long id, @Valid @RequestBody Ticket ticket) {
        return ResponseEntity.ok(ticketService.updateTicket(id, ticket));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Ticket> updateTicketStatus(
            @PathVariable Long id,
            @RequestParam TicketStatus status,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, status, reason));
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable Long id,
            @RequestParam Long assigneeId) {
        return ResponseEntity.ok(ticketService.assignTicket(id, assigneeId));
    }

    @PatchMapping("/{id}/resolution")
    public ResponseEntity<Ticket> updateResolution(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(ticketService.updateResolutionNotes(id, payload.get("resolutionNotes")));
    }

    @DeleteMapping({"/{id}", "/{id}/"})
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/attachment")
    public ResponseEntity<Ticket> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(ticketService.uploadAttachment(id, file));
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<Ticket> uploadAttachments(
            @PathVariable Long id,
            @RequestParam("files") List<MultipartFile> files) throws IOException {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("At least one image is required");
        }
        if (files.size() > 3) {
            throw new IllegalArgumentException("You can upload up to 3 images only");
        }
        return ResponseEntity.ok(ticketService.uploadAttachments(id, files));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.status(201).body(ticketService.addComment(id, payload.get("content")));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<Comment> updateComment(
            @PathVariable Long commentId,
            @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(ticketService.updateComment(commentId, payload.get("content")));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId) {
        ticketService.deleteComment(commentId);
        return ResponseEntity.noContent().build();
    }
}
