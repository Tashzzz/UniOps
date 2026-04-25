package com.example.uniops.security;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.example.uniops.model.user;
import com.example.uniops.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private final UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");
        String picture = oauthUser.getAttribute("picture");
        String subject = oauthUser.getAttribute("sub");

        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            userRepository.findByEmail(normalizedEmail).ifPresentOrElse(existing -> {
                existing.setProvider("google");
                existing.setProviderId(subject);
                existing.setAvatarUrl(picture);
                if (name != null && !name.isBlank()) {
                    existing.setName(name);
                }
                userRepository.save(existing);
            }, () -> userRepository.save(user.builder()
                    .email(normalizedEmail)
                    .name(name != null && !name.isBlank() ? name : normalizedEmail)
                    .role(user.Role.STUDENT)
                    .provider("google")
                    .providerId(subject)
                    .avatarUrl(picture)
                    .build()));
        }

        response.sendRedirect(frontendUrl + "/login?oauth=success");
    }
}
