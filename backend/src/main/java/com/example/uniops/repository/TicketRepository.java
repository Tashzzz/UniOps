package com.example.uniops.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.uniops.model.Ticket;
import com.example.uniops.model.Ticket.TicketStatus;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByStatus(TicketStatus status);
    List<Ticket> findByTitleContainingIgnoreCase(String title);
    List<Ticket> findByStatusAndTitleContainingIgnoreCase(TicketStatus status, String title);
}
