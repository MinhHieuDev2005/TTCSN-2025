package com.example.creatshop.social;

import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.util.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
@RequestMapping("/api/v1/auths/social/links")
@RequiredArgsConstructor
public class SocialLinkController {
    public static final String INTENT = "social-link";
    public record LinkIntent(String userId, String credentials, String provider, Instant expiresAt,
                             String state, SocialAuthService.VerifiedIdentity identity) {}
    private final UserRepository users;
    private final SocialIdentityRepository identities;
    private final JwtUtils jwt;
    private final ClientRegistrationRepository clients;
    private final SocialAuthConfig configuration;
    private final SocialAuthService service;

    @GetMapping
    public ResponseEntity<?> links(HttpServletRequest request) {
        User user = authenticated(request, false);
        return response(List.of("google", "facebook").stream().map(provider -> Map.of(
                "id", provider, "enabled", clients.findByRegistrationId(provider) != null,
                "linked", identities.existsByUserIdAndProvider(user.getId(), provider))).toList());
    }

    @PostMapping("/{provider}/start")
    public ResponseEntity<?> start(@PathVariable String provider, HttpServletRequest request) {
        sameOrigin(request);
        User user = authenticated(request, true);
        if (!List.of("google", "facebook").contains(provider) || clients.findByRegistrationId(provider) == null) {
            throw SocialAuthService.failure("provider_unavailable");
        }
        if (identities.existsByUserIdAndProvider(user.getId(), provider)) throw SocialAuthService.failure("provider_already_linked");
        var oldSession = request.getSession(false);
        if (oldSession != null) oldSession.invalidate();
        var session = request.getSession(true);
        session.setMaxInactiveInterval(300);
        session.setAttribute(INTENT, new LinkIntent(user.getId(), jwt.credentialStamp(user.getPassword()), provider,
                Instant.now().plusSeconds(300), null, null));
        return response(Map.of("authorizationPath", "/oauth2/authorization/" + provider + "?link=1"));
    }

    @GetMapping("/pending")
    public ResponseEntity<?> pending(HttpServletRequest request) {
        User user = authenticated(request, false);
        var intent = pendingFor(request, user);
        return response(Map.of("provider", intent.provider(), "email", intent.identity().email()));
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(HttpServletRequest request) {
        sameOrigin(request);
        User user = authenticated(request, true);
        var session = request.getSession(false);
        if (session == null) throw SocialAuthService.failure("link_expired");
        LinkIntent intent;
        synchronized (session) {
            intent = pendingFor(request, user);
            session.invalidate();
        }
        service.link(user.getId(), intent.credentials(), intent.identity());
        return response(Map.of("linked", true));
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(HttpServletRequest request) {
        sameOrigin(request);
        User user = authenticated(request, false);
        var session = request.getSession(false);
        if (session != null) {
            synchronized (session) {
                Object value = session.getAttribute(INTENT);
                if (value instanceof LinkIntent intent && intent.userId().equals(user.getId())) session.invalidate();
            }
        }
        return response(Map.of("cancelled", true));
    }

    private LinkIntent pendingFor(HttpServletRequest request, User user) {
        var session = request.getSession(false);
        Object value;
        try { value = session == null ? null : session.getAttribute(INTENT); }
        catch (IllegalStateException exception) { throw SocialAuthService.failure("link_expired"); }
        if (!(value instanceof LinkIntent intent) || intent.identity() == null || !intent.userId().equals(user.getId())
                || !intent.expiresAt().isAfter(Instant.now()) || !intent.credentials().equals(jwt.credentialStamp(user.getPassword()))) {
            throw SocialAuthService.failure("link_expired");
        }
        return intent;
    }

    private User authenticated(HttpServletRequest request, boolean recent) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        String token = header.substring(7);
        User user;
        Instant issued;
        try {
            user = users.findByUsername(jwt.getUsernameFromToken(token)).orElseThrow();
            if (user.getStatus() != AccountStatus.ACTIVE || !jwt.matchesCredentials(token, user.getPassword())) {
                throw new IllegalArgumentException();
            }
            issued = jwt.getIssuedAtFromToken(token).toInstant();
        } catch (RuntimeException exception) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        if (recent && (issued.isBefore(Instant.now().minusSeconds(300)) || issued.isAfter(Instant.now().plusSeconds(30)))) {
            throw SocialAuthService.failure("reauth_required");
        }
        return user;
    }

    private void sameOrigin(HttpServletRequest request) {
        if (!configuration.frontendOrigin().equals(request.getHeader("Origin"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private ResponseEntity<?> response(Object data) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("data", data));
    }

    @ExceptionHandler(OAuth2AuthenticationException.class)
    public ResponseEntity<?> refused(OAuth2AuthenticationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore())
                .body(Map.of("code", exception.getError().getErrorCode()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore()).body(Map.of("code", "identity_in_use"));
    }
}
