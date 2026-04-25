package com.example.uniops.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.uniops.repository.UserRepository;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final ObjectProvider<HeaderUserAuthenticationFilter> headerUserAuthenticationFilterProvider;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider;

    public SecurityConfig(
            ObjectProvider<HeaderUserAuthenticationFilter> headerUserAuthenticationFilterProvider,
            OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider) {
        this.headerUserAuthenticationFilterProvider = headerUserAuthenticationFilterProvider;
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
        this.clientRegistrationRepositoryProvider = clientRegistrationRepositoryProvider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/error", "/uploads/**").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/login-or-register", "/api/auth/me", "/api/auth/google").permitAll()
                .requestMatchers("/api/auth/users").hasAnyRole("ADMIN", "STAFF")
                .anyRequest().permitAll())
            .logout(Customizer.withDefaults());

        HeaderUserAuthenticationFilter headerFilter = headerUserAuthenticationFilterProvider.getIfAvailable();
        if (headerFilter != null) {
            http.addFilterBefore(headerFilter, UsernamePasswordAuthenticationFilter.class);
        }

        if (clientRegistrationRepositoryProvider.getIfAvailable() != null) {
            http.oauth2Login(oauth -> oauth.successHandler(oAuth2LoginSuccessHandler));
        }

        return http.build();
    }

    @Bean
    public HeaderUserAuthenticationFilter headerUserAuthenticationFilter(ObjectProvider<UserRepository> userRepositoryProvider) {
        UserRepository userRepository = userRepositoryProvider.getIfAvailable();
        if (userRepository == null) {
            return null;
        }
        return new HeaderUserAuthenticationFilter(userRepository);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}