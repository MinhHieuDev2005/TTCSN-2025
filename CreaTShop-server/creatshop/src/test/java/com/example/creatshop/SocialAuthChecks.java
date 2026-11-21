package com.example.creatshop;

import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.social.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import com.sun.net.httpserver.HttpServer;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

public class SocialAuthChecks {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static String providerBase;
    private static String base;
    private static String nonce;
    private static String subject = "google-one";
    private static String email = "google@example.test";
    private static boolean verified = true;
    private static String tokenFault = "";
    private static volatile Runnable tokenHook;
    private static final String FRONTEND = "http://localhost:5173";
    private static int passed;

    @TestConfiguration(proxyBeanMethods = false)
    public static class MockClients {
        @Bean
        @Primary
        ClientRegistrationRepository mockClients() {
            var google = CommonOAuth2Provider.GOOGLE.getBuilder("google").clientId("google-test").clientSecret("secret")
                    .authorizationUri(providerBase + "/authorize").tokenUri(providerBase + "/token")
                    .jwkSetUri(providerBase + "/keys").issuerUri(providerBase).userInfoUri(providerBase + "/userinfo")
                    .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}").build();
            var facebook = CommonOAuth2Provider.FACEBOOK.getBuilder("facebook").clientId("facebook-test").clientSecret("secret")
                    .authorizationUri(providerBase + "/authorize").tokenUri(providerBase + "/token")
                    .userInfoUri(providerBase + "/userinfo").redirectUri("{baseUrl}/login/oauth2/code/{registrationId}").build();
            return id -> Map.of("google", google, "facebook", facebook).get(id);
        }
    }

    public static void main(String[] args) throws Exception {
        RSAKey key = new RSAKeyGenerator(2048).keyID("test-key").generate();
        RSAKey untrustedKey = new RSAKeyGenerator(2048).generate();
        HttpServer provider = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        providerBase = "http://127.0.0.1:" + provider.getAddress().getPort();
        provider.createContext("/", exchange -> {
            try {
                Map<String, Object> profile = new HashMap<>(Map.of("sub", subject, "id", subject, "given_name", "Social", "family_name", "Buyer",
                        "first_name", "Social", "last_name", "Buyer", "email_verified", verified));
                if (email != null) profile.put("email", email);
                Object body = profile;
                if (exchange.getRequestURI().getPath().equals("/keys")) body = new JWKSet(key.toPublicJWK()).toJSONObject();
                if (exchange.getRequestURI().getPath().equals("/token")) {
                    var hook = tokenHook;
                    tokenHook = null;
                    if (hook != null) hook.run();
                    var claims = new JWTClaimsSet.Builder().issuer(tokenFault.equals("issuer") ? "https://evil.test" : providerBase)
                            .subject(subject).audience(tokenFault.equals("audience") ? "other-client" : "google-test")
                            .issueTime(Date.from(Instant.now().minusSeconds(600)))
                            .expirationTime(Date.from(Instant.now().plusSeconds(tokenFault.equals("expired") ? -300 : 300)))
                            .claim("nonce", tokenFault.equals("nonce") ? "wrong-nonce" : nonce)
                            .claim("email", email).claim("email_verified", verified).build();
                    var token = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
                    token.sign(new RSASSASigner(tokenFault.equals("signature") ? untrustedKey : key));
                    body = Map.of("access_token", "provider-access", "token_type", "Bearer", "expires_in", 300, "id_token", token.serialize());
                }
                byte[] bytes = JSON.writeValueAsBytes(body);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                exchange.getResponseBody().write(bytes);
            } catch (Exception exception) { throw new RuntimeException(exception); }
            finally { exchange.close(); }
        });
        provider.start();
        runChecks(provider);
    }

    private static void runChecks(HttpServer provider) throws Exception {
        try (var context = new SpringApplicationBuilder(CreatshopApplication.class, MockClients.class).run(
                "--spring.config.location=optional:classpath:/social-test-only.properties",
                "--debug=false", "--logging.level.org.springframework=ERROR", "--logging.level.org.hibernate=ERROR",
                "--app.frontend-url=" + FRONTEND, "--app.oauth2.google.client-id=", "--app.oauth2.google.client-secret=",
                "--app.oauth2.facebook.client-id=", "--app.oauth2.facebook.client-secret=",
                "--server.address=127.0.0.1", "--server.port=0", "--spring.main.banner-mode=off", "--logging.level.root=ERROR",
                "--spring.datasource.url=jdbc:h2:mem:social_auth;MODE=MySQL;DB_CLOSE_DELAY=-1", "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username=sa", "--spring.datasource.password=", "--spring.jpa.hibernate.ddl-auto=create-drop",
                "--cloudinary.cloud_name=test", "--cloudinary.api_key=test", "--cloudinary.api_secret=test",
                "--vnp.url=https://example.test/pay", "--vnp.return-url=http://localhost/return", "--vnp.tmn-code=test", "--vnp.hash-secret=test",
                "--auth.token.jwtSecret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=", "--auth.token.expirationInMils=3600000", "--auth.token.refreshInMils=7200000")) {
            base = "http://127.0.0.1:" + ((ServletWebServerApplicationContext) context).getWebServer().getPort();
            var clients = new SocialAuthConfig(FRONTEND).socialClients("", "", "", "", "v23.0", "http://localhost:8080");
            assert clients.findByRegistrationId("google") == null && clients.findByRegistrationId("facebook") == null;
            pass("providers stay disabled without credentials; application starts without OAuth secrets");
            HttpClient browser = browser();
            assert call(browser, "GET", "/api/v1/auths/social/providers", null, null).statusCode() == 200;
            var callback = authorize(browser, "google", false);
            assert location(callback).equals(FRONTEND + "/login?social=success") : location(callback);
            assert call(browser, "GET", "/api/v1/users/me", null, null).statusCode() == 401 : "OAuth cookie must not authenticate JWT APIs";
            assert call(browser, "POST", "/api/v1/auths/social/exchange", null, null).statusCode() == 403;
            assert call(browser, "POST", "/api/v1/auths/social/exchange", "https://evil.test", null).statusCode() == 403;
            var response = call(browser, "POST", "/api/v1/auths/social/exchange", FRONTEND, null);
            assert response.statusCode() == 200 : response.body();
            String token = JSON.readTree(response.body()).path("data").path("accessToken").asText();
            assert JSON.readTree(response.body()).path("data").path("roles").asText().equals("ROLE_USER");
            var me = JSON.readTree(call(browser, "GET", "/api/v1/users/me", null, token).body()).path("data");
            String userId = me.path("id").asText();
            assert me.path("email").asText().equals(email);
            assert me.path("passwordConfigured").isBoolean() && !me.path("passwordConfigured").asBoolean();
            var passwordChange = browser.send(HttpRequest.newBuilder(URI.create(base + "/api/v1/users/me/password"))
                    .header("Authorization", "Bearer " + token).header("Content-Type", "application/json")
                    .PUT(HttpRequest.BodyPublishers.ofString("{\"currentPassword\":\"Unknown9!Pass\",\"newPassword\":\"Changed9!Pass\"}"))
                    .build(), HttpResponse.BodyHandlers.ofString());
            assert passwordChange.statusCode() == 400 && passwordChange.body().contains("no local password") : passwordChange.body();
            pass("social signup records no local password and rejects the current-password change endpoint");
            assert call(browser, "GET", "/api/v1/carts", null, token).statusCode() == 200;
            assert call(browser, "GET", "/api/v1/admin/dashboard", null, token).statusCode() == 403;
            assert call(browser, "POST", "/api/v1/auths/social/exchange", FRONTEND, null).statusCode() == 401;
            pass("Google OIDC verifies signed ID token, creates customer/cart, exchanges once and rejects foreign Origin and admin access");
            checkOtherFlows(context, userId, browser);
            System.out.println("PASS: " + passed + " social authentication checks; mock providers and isolated H2 only.");
        } finally { provider.stop(0); }
    }

    private static void checkLinkFlows(org.springframework.context.ConfigurableApplicationContext context, String userId) throws Exception {
        var service = context.getBean(SocialAuthService.class);
        var users = context.getBean(UserRepository.class);
        var identities = context.getBean(SocialIdentityRepository.class);
        var user = users.findById(userId).orElseThrow();
        String token = service.tokenFor(userId).getAccessToken();
        String cartId = user.getCart().getId().toString();
        long count = users.count();
        HttpClient linking = browser();
        String start = "/api/v1/auths/social/links/facebook/start";
        assert call(linking, "GET", "/api/v1/auths/social/links", null, null).statusCode() == 401;
        assert call(linking, "POST", start, FRONTEND, null).statusCode() == 401;
        assert call(linking, "POST", start, null, token).statusCode() == 403;
        assert call(linking, "POST", start, "https://evil.test", token).statusCode() == 403;
        assert call(linking, "POST", start, FRONTEND, "invalid").statusCode() == 401;
        assert call(linking, "POST", "/api/v1/auths/social/links/unknown/start", FRONTEND, token).statusCode() == 409;
        assert call(linking, "POST", "/api/v1/auths/social/links/google/start", FRONTEND, token).body().contains("provider_already_linked");
        var preflight = linking.send(HttpRequest.newBuilder(URI.create(base + start)).header("Origin", FRONTEND)
                .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "authorization,content-type")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assert preflight.statusCode() == 200;
        assert preflight.headers().firstValue("Access-Control-Allow-Origin").orElseThrow().equals(FRONTEND);
        assert preflight.headers().firstValue("Access-Control-Allow-Credentials").orElseThrow().equals("true");
        pass("linking requires current JWT, exact Origin and an available, unlinked provider");
        subject = "facebook-one"; email = "facebook@example.test";
        assert call(linking, "POST", start, FRONTEND, token).statusCode() == 200;
        assert location(authorize(linking, "facebook", false, true)).equals(FRONTEND + "/profile?link=confirm");
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).body().contains("identity_in_use");
        assert identities.count() == 2;
        subject = "facebook-unclaimed";
        assert call(linking, "POST", start, FRONTEND, token).statusCode() == 200;
        authorize(linking, "facebook", false, true);
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).body().contains("email_exists");
        assert identities.count() == 2;
        pass("another shop account's identity or email cannot be stolen or merged by linking");

        subject = "facebook-cancel-during-callback"; email = "cancel-new@example.test";
        assert call(linking, "POST", start, FRONTEND, token).statusCode() == 200;
        tokenHook = () -> {
            try { assert call(linking, "POST", "/api/v1/auths/social/links/cancel", FRONTEND, token).statusCode() == 200; }
            catch (Exception exception) { throw new RuntimeException(exception); }
        };
        assert location(authorize(linking, "facebook", false, true)).contains("/profile?link=error&reason=link_expired");
        assert users.count() == count && identities.count() == 2;
        pass("cancelling during token exchange never falls back to signing in or creating a new shop account");

        subject = "facebook-linked"; email = "google@example.test";
        assert call(linking, "POST", start, FRONTEND, token).statusCode() == 200;
        assert location(authorize(linking, "facebook", true, true)).contains("/profile?link=error");
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).statusCode() == 409;
        assert call(linking, "POST", start, FRONTEND, token).statusCode() == 200;
        authorize(linking, "facebook", false, true);
        assert call(linking, "POST", "/api/v1/auths/social/links/cancel", FRONTEND, token).statusCode() == 200;
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).statusCode() == 409;
        assert identities.count() == 2;
        pass("tampered OAuth state and cancellation leave no linked identity; confirmation cannot replay");

        assert call(linking, "POST", start, FRONTEND, token).statusCode() == 200;
        authorize(linking, "facebook", false, true);
        assert identities.count() == 2 : "Callback alone must not link";
        var pending = call(linking, "GET", "/api/v1/auths/social/links/pending", null, token);
        assert JSON.readTree(pending.body()).path("data").path("email").asText().equals(email);
        assert call(linking, "POST", "/api/v1/auths/social/exchange", FRONTEND, null).statusCode() == 401 : "Linking must not issue login tokens";
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", "https://evil.test", token).statusCode() == 403;
        String otherId = identities.findByProviderAndSubject("facebook", "facebook-one").orElseThrow().getUser().getId();
        String otherToken = service.tokenFor(otherId).getAccessToken();
        assert call(linking, "GET", "/api/v1/auths/social/links/pending", null, otherToken).statusCode() == 409;
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, otherToken).statusCode() == 409;
        HttpClient competing = browser();
        assert call(competing, "POST", start, FRONTEND, token).statusCode() == 200;
        subject = "facebook-competing";
        authorize(competing, "facebook", false, true);
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).statusCode() == 200;
        assert call(competing, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).body().contains("provider_already_linked");
        assert call(linking, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).statusCode() == 409;
        assert users.count() == count && identities.count() == 3;
        assert users.findById(userId).orElseThrow().getCart().getId().toString().equals(cartId);
        subject = "facebook-linked";
        HttpClient login = browser();
        assert location(authorize(login, "facebook", false)).endsWith("social=success");
        var exchange = call(login, "POST", "/api/v1/auths/social/exchange", FRONTEND, null);
        String linkedToken = JSON.readTree(exchange.body()).path("data").path("accessToken").asText();
        assert JSON.readTree(call(login, "GET", "/api/v1/users/me", null, linkedToken).body()).path("data").path("id").asText().equals(userId);
        assert !JSON.readTree(exchange.body()).path("data").path("roles").asText().contains("ADMIN");
        pass("explicit confirmation preserves user/cart/role; competing requests do not replace links; Facebook signs in to the original account");
        checkGoogleLink(context, otherId, otherToken);
    }

    private static void checkGoogleLink(org.springframework.context.ConfigurableApplicationContext context, String userId, String token) throws Exception {
        verified = true; subject = "google-linked"; email = "facebook@example.test";
        var identities = context.getBean(SocialIdentityRepository.class);
        var users = context.getBean(UserRepository.class);
        var jwt = context.getBean(com.example.creatshop.util.JwtUtils.class);
        var user = users.findById(userId).orElseThrow();
        HttpClient google = browser();
        String stale = io.jsonwebtoken.Jwts.builder().setSubject(user.getUsername())
                .claim("credentials", jwt.credentialStamp(user.getPassword())).setIssuedAt(Date.from(Instant.now().minusSeconds(600)))
                .setExpiration(Date.from(Instant.now().plusSeconds(600)))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(io.jsonwebtoken.io.Decoders.BASE64.decode(
                        "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")), io.jsonwebtoken.SignatureAlgorithm.HS256).compact();
        assert call(google, "POST", "/api/v1/auths/social/links/google/start", FRONTEND, stale).body().contains("reauth_required");
        assert call(google, "GET", "/api/v1/auths/social/links", null, stale).statusCode() == 200;
        assert call(google, "POST", "/api/v1/auths/social/links/google/start", FRONTEND, token).statusCode() == 200;
        assert location(authorize(google, "google", false, true)).endsWith("/profile?link=confirm");
        var transactions = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        transactions.executeWithoutResult(transaction -> {
            var changed = users.findById(userId).orElseThrow();
            changed.setStatus(AccountStatus.BANNED);
            users.save(changed);
        });
        assert call(google, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).statusCode() == 401;
        assert identities.findByProviderAndSubject("google", subject).isEmpty();
        transactions.executeWithoutResult(transaction -> {
            var changed = users.findById(userId).orElseThrow();
            changed.setStatus(AccountStatus.ACTIVE);
            changed.setPassword("changed-credential-hash-for-test");
            users.save(changed);
        });
        assert call(google, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).statusCode() == 401;
        assert identities.findByProviderAndSubject("google", subject).isEmpty();
        transactions.executeWithoutResult(transaction -> {
            var changed = users.findById(userId).orElseThrow();
            changed.setPassword(user.getPassword());
            users.save(changed);
        });
        assert call(google, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, stale).body().contains("reauth_required");
        assert call(google, "POST", "/api/v1/auths/social/links/confirm", FRONTEND, token).statusCode() == 200;
        assert identities.findByProviderAndSubject("google", subject).orElseThrow().getUser().getId().equals(userId);
        assert users.count() == 2;
        var request = new MockHttpServletRequest();
        request.addHeader("Origin", FRONTEND); request.addHeader("Authorization", "Bearer " + token);
        var expired = new MockHttpSession();
        expired.setAttribute(SocialLinkController.INTENT, new SocialLinkController.LinkIntent(userId,
                jwt.credentialStamp(user.getPassword()), "google", Instant.now().minusSeconds(1), null,
                new SocialAuthService.VerifiedIdentity("google", "expired", "facebook@example.test")));
        request.setSession(expired);
        try { context.getBean(SocialLinkController.class).confirm(request); throw new AssertionError("Expired link accepted"); }
        catch (org.springframework.security.oauth2.core.OAuth2AuthenticationException exception) { assert exception.getError().getErrorCode().equals("link_expired"); }
        pass("Google links after verified OIDC and confirmation; old sign-in and expired requests cannot link");
    }

    private static void checkOtherFlows(org.springframework.context.ConfigurableApplicationContext context, String userId, HttpClient browser) throws Exception {
        for (String fault : List.of("signature", "issuer", "audience", "nonce", "expired")) {
            tokenFault = fault;
            HttpClient invalid = browser();
            assert location(authorize(invalid, "google", false)).endsWith("reason=login_failed") : fault;
            assert call(invalid, "POST", "/api/v1/auths/social/exchange", FRONTEND, null).statusCode() == 401 : fault;
            assert context.getBean(UserRepository.class).count() == 1 : fault;
        }
        tokenFault = "";
        pass("invalid OIDC signature, issuer, audience, nonce and expired tokens cannot create a session");
        email = "changed@example.test";
        assert location(authorize(browser, "google", false)).endsWith("social=success");
        assert call(browser, "POST", "/api/v1/auths/social/exchange", FRONTEND, null).statusCode() == 200;
        assert context.getBean(UserRepository.class).count() == 1;
        assert location(authorize(browser(), "google", true)).contains("social=error");
        pass("repeat login uses stable provider subject; invalid OAuth state cannot log in");
        subject = "google-unverified"; email = "unverified@example.test"; verified = false;
        assert location(authorize(browser(), "google", false)).endsWith("reason=email_unverified");
        subject = "facebook-one"; email = "facebook@example.test";
        HttpClient facebook = browser();
        assert location(authorize(facebook, "facebook", false)).endsWith("social=success");
        assert call(facebook, "POST", "/api/v1/auths/social/exchange", FRONTEND, null).statusCode() == 200;
        subject = "facebook-other"; email = "google@example.test";
        assert location(authorize(browser(), "facebook", false)).endsWith("reason=email_exists");
        email = null;
        assert location(authorize(browser(), "facebook", false)).endsWith("reason=email_required");
        assert context.getBean(UserRepository.class).count() == 2;
        pass("Facebook works; missing email, unverified Google email and collisions are refused without merging accounts");
        checkLinkFlows(context, userId);
        subject = "google-one"; email = "google@example.test"; verified = true;
        HttpClient pending = browser();
        assert location(authorize(pending, "google", false)).endsWith("social=success");
        new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).executeWithoutResult(transaction -> {
            UserRepository users = context.getBean(UserRepository.class);
            var user = users.findById(userId).orElseThrow();
            user.setStatus(AccountStatus.BANNED);
            users.save(user);
        });
        assert call(pending, "POST", "/api/v1/auths/social/exchange", FRONTEND, null).statusCode() == 401;
        assert location(authorize(browser(), "google", false)).endsWith("reason=account_locked");
        pass("locked accounts cannot sign in or exchange a pending login issued before the lock");
        var request = new MockHttpServletRequest();
        var session = new MockHttpSession();
        session.setAttribute(SocialAuthController.PENDING, new SocialAuthController.PendingLogin(userId, Instant.now().minusSeconds(1)));
        request.setSession(session); request.addHeader("Origin", FRONTEND);
        try { context.getBean(SocialAuthController.class).exchange(request); throw new AssertionError("Expired login accepted"); }
        catch (ResponseStatusException exception) { assert exception.getStatusCode().value() == 401; }
        pass("expired pending logins cannot be exchanged");
    }

    private static HttpClient browser() { return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build(); }
    private static HttpResponse<String> authorize(HttpClient browser, String provider, boolean tampered) throws Exception {
        return authorize(browser, provider, tampered, false);
    }
    private static HttpResponse<String> authorize(HttpClient browser, String provider, boolean tampered, boolean linking) throws Exception {
        var start = call(browser, "GET", "/oauth2/authorization/" + provider + (linking ? "?link=1" : ""), null, null);
        assert start.statusCode() == 302 : start.body();
        URI authorization = URI.create(location(start));
        Map<String, String> fields = new HashMap<>();
        for (String pair : authorization.getRawQuery().split("&")) {
            var parts = pair.split("=", 2);
            fields.put(URLDecoder.decode(parts[0], StandardCharsets.UTF_8), URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
        }
        nonce = fields.get("nonce");
        if (provider.equals("google")) {
            assert "select_account".equals(fields.get("prompt")) : "Google must allow account selection on every login";
            if (linking) assert "0".equals(fields.get("max_age"));
        } else {
            assert !fields.containsKey("prompt") : "Google account selection must not affect other providers";
            if (linking) assert "reauthenticate".equals(fields.get("auth_type"));
        }
        assert fields.get("redirect_uri").equals(base + "/login/oauth2/code/" + provider);
        String state = tampered ? "attacker-state" : fields.get("state");
        var callback = call(browser, "GET", "/login/oauth2/code/" + provider + "?code=valid&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8), null, null);
        assert !location(callback).contains("accessToken") && !location(callback).contains("access_token");
        return callback;
    }
    private static String location(HttpResponse<String> response) { return response.headers().firstValue("Location").orElseThrow(() -> new AssertionError(response.statusCode() + ": " + response.body())); }
    private static void pass(String message) { passed++; System.out.println("PASS: " + message); }
    private static HttpResponse<String> call(HttpClient browser, String method, String path, String origin, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(base + path));
        if (origin != null) request.header("Origin", origin);
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (method.equals("POST")) request.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}"));
        else request.GET();
        return browser.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
