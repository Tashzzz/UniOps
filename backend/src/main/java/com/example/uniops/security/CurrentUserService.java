package com.example.uniops.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.example.uniops.model.user;
import com.example.uniops.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public user getRequiredUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Authentication is required.");
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof OAuth2User oauth2User) {
            String email = oauth2User.getAttribute("email");
            return findByEmail(email);
        }

        return findByEmail(auth.getName());
    }

    public boolean isAdminOrStaff(user currentUser) {
        return currentUser.getRole() == user.Role.ADMIN || currentUser.getRole() == user.Role.STAFF;
    }

    public void requireAdminOrStaff(user currentUser) {
        if (!isAdminOrStaff(currentUser)) {
            throw new IllegalStateException("Admin or staff privileges are required for this action.");
        }
    }

    public boolean isOperationsStaff(user currentUser) {
        return isAdminOrStaff(currentUser) || currentUser.getRole() == user.Role.TECHNICIAN;
    }

    private user findByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Unable to resolve authenticated user.");
        }
        return userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new IllegalStateException("Authenticated user account not found."));
    }
}
