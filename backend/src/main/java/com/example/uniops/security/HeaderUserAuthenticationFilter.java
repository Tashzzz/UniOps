package com.example.uniops.security;

import java.io.IOException;

import org.springframework.lang.NonNull;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.uniops.model.user;
import com.example.uniops.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@ConditionalOnBean(UserRepository.class)
@RequiredArgsConstructor
public class HeaderUserAuthenticationFilter extends OncePerRequestFilter {

    private static final String USER_EMAIL_HEADER = "X-User-Email";

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String email = request.getHeader(USER_EMAIL_HEADER);
            if (email != null && !email.isBlank()) {
                userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(dbUser -> {
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            dbUser.getEmail(),
                            null,
                            java.util.List.of(new SimpleGrantedAuthority("ROLE_" + dbUser.getRole().name())));
                    auth.setDetails(dbUser);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            }
        }
        filterChain.doFilter(request, response);
    }
}
