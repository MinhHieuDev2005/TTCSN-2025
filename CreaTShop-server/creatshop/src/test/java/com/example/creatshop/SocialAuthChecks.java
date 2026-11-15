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
            assert call(browser, "GET", "/api/v1/carts", null, token).statusCode() == 200;
            assert call(browser, "GET", "/api/v1/admin/dashboard", null, token).statusCode() == 403;
            assert call(browser, "POST", "/api/v1/auths/social/exchange", FRONTEND, null).statusCode() == 401;
            pass("Google OIDC verifies signed ID token, creates customer/cart, exchanges once and rejects foreign Origin and admin access");
            checkOtherFlows(context, userId, browser);
            System.out.println("PASS: " + passed + " social authentication checks; mock providers and isolated H2 only.");
        } finally { provider.stop(0); }
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
        var start = call(browser, "GET", "/oauth2/authorization/" + provider, null, null);
        assert start.statusCode() == 302 : start.body();
        URI authorization = URI.create(location(start));
        Map<String, String> fields = new HashMap<>();
        for (String pair : authorization.getRawQuery().split("&")) {
            var parts = pair.split("=", 2);
            fields.put(URLDecoder.decode(parts[0], StandardCharsets.UTF_8), URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
        }
        nonce = fields.get("nonce");
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
