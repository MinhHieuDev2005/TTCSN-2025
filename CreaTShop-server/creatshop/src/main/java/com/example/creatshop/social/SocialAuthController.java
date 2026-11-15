package com.example.creatshop.social;

import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.response.AuthResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auths/social")
@RequiredArgsConstructor
public class SocialAuthController {
    public static final String PENDING = "social-login";
    public record PendingLogin(String userId, Instant expiresAt) {}
    private final ClientRegistrationRepository clients;
    private final SocialAuthService service;
    private final SocialAuthConfig configuration;

    @GetMapping("/providers")
    public ResponseEntity<?> providers() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("data", List.of(
                Map.of("id", "google", "enabled", clients.findByRegistrationId("google") != null),
                Map.of("id", "facebook", "enabled", clients.findByRegistrationId("facebook") != null))));
    }

    @PostMapping("/exchange")
    public ResponseEntity<GlobalResponse<Meta, AuthResponse>> exchange(HttpServletRequest request) {
        if (!configuration.frontendOrigin().equals(request.getHeader("Origin"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var session = request.getSession(false);
        if (session == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        PendingLogin pending;
        synchronized (session) {
            Object value;
            try { value = session.getAttribute(PENDING); }
            catch (IllegalStateException exception) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
            if (!(value instanceof PendingLogin login)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            pending = login;
            session.invalidate();
        }
        if (!pending.expiresAt().isAfter(Instant.now())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        try {
            var response = GlobalResponse.<Meta, AuthResponse>builder().meta(Meta.builder().status(Status.SUCCESS).build())
                    .data(service.tokenFor(pending.userId())).build();
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
        } catch (OAuth2AuthenticationException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
