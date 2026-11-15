package com.example.creatshop.social;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.context.NullSecurityContextRepository;
import org.springframework.web.cors.CorsConfigurationSource;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Configuration(proxyBeanMethods = false)
public class SocialAuthConfig {
    private final String frontend;

    public SocialAuthConfig(@Value("${app.frontend-url:${FRONTEND_URL:http://localhost:5173}}") String frontend) {
        this.frontend = origin(frontend);
    }

    public String frontendOrigin() { return frontend; }

    private static String origin(String value) {
        URI uri = URI.create(value);
        if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null || !(uri.getPath().isEmpty() || uri.getPath().equals("/"))) {
            throw new IllegalArgumentException("OAuth URLs must be an http(s) origin without a path");
        }
        return uri.getScheme() + "://" + uri.getRawAuthority();
    }

    @Bean
    public ClientRegistrationRepository socialClients(
            @Value("${app.oauth2.google.client-id:${GOOGLE_CLIENT_ID:}}") String googleId,
            @Value("${app.oauth2.google.client-secret:${GOOGLE_CLIENT_SECRET:}}") String googleSecret,
            @Value("${app.oauth2.facebook.client-id:${FACEBOOK_CLIENT_ID:}}") String facebookId,
            @Value("${app.oauth2.facebook.client-secret:${FACEBOOK_CLIENT_SECRET:}}") String facebookSecret,
            @Value("${app.oauth2.facebook.graph-version:${FACEBOOK_GRAPH_VERSION:v23.0}}") String graphVersion,
            @Value("${app.oauth2.base-url:${OAUTH2_BASE_URL:http://localhost:8080}}") String baseUrl) {
        Map<String, ClientRegistration> clients = new HashMap<>();
        String callback = origin(baseUrl) + "/login/oauth2/code/{registrationId}";
        if (!googleId.isBlank() && !googleSecret.isBlank()) clients.put("google", CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(googleId).clientSecret(googleSecret).scope("openid", "profile", "email").redirectUri(callback).build());
        if (!facebookId.isBlank() && !facebookSecret.isBlank()) {
            if (!graphVersion.matches("v[0-9]+\\.[0-9]+")) throw new IllegalArgumentException("Invalid Facebook Graph API version");
            clients.put("facebook", CommonOAuth2Provider.FACEBOOK.getBuilder("facebook")
                    .clientId(facebookId).clientSecret(facebookSecret).scope("public_profile", "email")
                    .authorizationUri("https://www.facebook.com/" + graphVersion + "/dialog/oauth")
                    .tokenUri("https://graph.facebook.com/" + graphVersion + "/oauth/access_token")
                    .userInfoUri("https://graph.facebook.com/" + graphVersion + "/me?fields=id,first_name,last_name,email")
                    .redirectUri(callback).build());
        }
        return clients::get;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain socialSecurity(HttpSecurity http, ClientRegistrationRepository clients, SocialAuthService service,
            @Qualifier("corsConfigurationSource") CorsConfigurationSource cors) throws Exception {
        var authorizedClients = new HttpSessionOAuth2AuthorizedClientRepository();
        http.securityMatcher("/oauth2/**", "/login/oauth2/**", "/api/v1/auths/social/**")
                .cors(config -> config.configurationSource(cors))
                .csrf(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
                .exceptionHandling(errors -> errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .oauth2Login(oauth -> oauth.clientRegistrationRepository(clients).authorizedClientRepository(authorizedClients)
                        .successHandler((request, response, authentication) -> {
                            try {
                                var login = (OAuth2AuthenticationToken) authentication;
                                authorizedClients.removeAuthorizedClient(login.getAuthorizedClientRegistrationId(), authentication, request, response);
                                String userId = service.resolve(login.getAuthorizedClientRegistrationId(), login.getPrincipal());
                                var session = request.getSession();
                                session.setMaxInactiveInterval(60);
                                session.setAttribute(SocialAuthController.PENDING, new SocialAuthController.PendingLogin(userId, Instant.now().plusSeconds(60)));
                                response.setHeader("Cache-Control", "no-store");
                                response.sendRedirect(frontend + "/login?social=success");
                            } catch (OAuth2AuthenticationException exception) {
                                fail(request, response, exception.getError().getErrorCode());
                            } catch (RuntimeException exception) {
                                fail(request, response, "login_failed");
                            }
                        })
                        .failureHandler((request, response, exception) -> fail(request, response, "login_failed")));
        return http.build();
    }

    private void fail(HttpServletRequest request, HttpServletResponse response, String reason) throws IOException {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        String code = Set.of("email_exists", "email_required", "email_unverified", "account_locked").contains(reason) ? reason : "login_failed";
        response.setHeader("Cache-Control", "no-store");
        response.sendRedirect(frontend + "/login?social=error&reason=" + code);
    }
}
