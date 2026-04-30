package com.example.uniops.security;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);

    @Value("${FRONTEND_URL:http://localhost:5173}")
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
            log.info("OAuth success for email={} subject={}", normalizedEmail, subject);
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

            String encodedEmail = URLEncoder.encode(normalizedEmail, StandardCharsets.UTF_8);
            String encodedName = URLEncoder.encode(
                    name != null && !name.isBlank() ? name : normalizedEmail,
                    StandardCharsets.UTF_8);
            log.info("Redirecting OAuth success to frontend with email param at {}", frontendUrl);
            response.sendRedirect(frontendUrl + "/login?oauth=success&email=" + encodedEmail + "&name=" + encodedName);
            return;
        }

        log.warn("OAuth success callback missing email claim. Redirecting with oauth error.");
        response.sendRedirect(frontendUrl + "/login?oauth=error&reason="
                + URLEncoder.encode("Google account email was not provided.", StandardCharsets.UTF_8));
    }
}
