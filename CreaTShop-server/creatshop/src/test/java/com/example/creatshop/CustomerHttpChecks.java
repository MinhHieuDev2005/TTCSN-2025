package com.example.creatshop;

import com.example.creatshop.domain.entity.Product;
import com.example.creatshop.domain.entity.ProductVariant;
import com.example.creatshop.repository.ProductRepository;
import com.example.creatshop.repository.ProductVariantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import com.example.creatshop.util.VNPayUtil;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

public class CustomerHttpChecks {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient CLIENT = HttpClient.newHttpClient();
    private static String base;
    private static int passed;

    public static void main(String[] args) throws Exception {
        try (var context = new SpringApplicationBuilder(CreatshopApplication.class).run(
                "--spring.config.location=optional:classpath:/customer-http-only.properties",
                "--server.address=127.0.0.1", "--server.port=0", "--debug=false",
                "--spring.datasource.url=jdbc:h2:mem:customer_http;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
                "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.jpa.hibernate.ddl-auto=create-drop", "--spring.main.banner-mode=off",
                "--logging.level.root=ERROR", "--logging.level.org.springframework=ERROR",
                "--cloudinary.cloud_name=isolated", "--cloudinary.api_key=isolated", "--cloudinary.api_secret=isolated",
                "--vnp.url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "--vnp.return-url=http://localhost/payment-return", "--vnp.tmn-code=REGRESSION", "--vnp.hash-secret=regression-only-vnpay-secret",
                "--auth.token.jwtSecret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
                "--auth.token.expirationInMils=3600000", "--auth.token.refreshInMils=7200000")) {
            base = "http://127.0.0.1:" + ((ServletWebServerApplicationContext) context).getWebServer().getPort() + "/api/v1";
            call("GET", "/users/me", null, null, 401);
            call("PUT", "/users", Map.of(), null, 401);
            call("PUT", "/users/me/password", Map.of(), null, 401);
            var signup = Map.of("username", "httpbuyer", "password", "Review9!Pass", "firstName", "Buyer", "lastName", "Test",
                    "email", "buyer@example.test", "phoneNumber", "0900000000");
            var invalid = new java.util.HashMap<>(signup);
            invalid.put("firstName", "");
            require(call("POST", "/users", invalid, null, 400).path("data").path("firstName").isTextual(), "Missing structured validation error");
            call("POST", "/users", signup, null, 201);
            String token = login("Review9!Pass");
            require(call("GET", "/users/me", null, token, 200).path("data").path("passwordConfigured").asBoolean(), "Password signup must record a configured password");
            call("GET", "/users", null, token, 403);
            var profile = Map.of("firstName", "Updated", "lastName", "Test", "email", "buyer@example.test", "phoneNumber", "0900000000", "password", "Ignored9!Pass");
            call("PUT", "/users", profile, token, 200);
            var edit = new java.util.HashMap<String, Object>(Map.of("firstName", " Updated ", "lastName", "Test", "phoneNumber", "0900000000"));
            edit.put("username", "hijacked"); edit.put("role", "ROLE_ADMIN"); edit.put("status", "BANNED"); edit.put("passwordConfigured", false);
            var saved = call("PUT", "/users", edit, token, 200).path("data");
            require(saved.path("firstName").asText().equals("Updated") && saved.path("email").asText().equals("buyer@example.test")
                    && saved.path("username").asText().equals("httpbuyer") && saved.path("role").asText().equals("ROLE_USER")
                    && saved.path("passwordConfigured").asBoolean(), "Profile edits must trim names and whitelist personal fields only");
            edit.put("email", "unverified@example.test"); edit.put("firstName", "Must not save");
            call("PUT", "/users", edit, token, 400);
            saved = call("GET", "/users/me", null, token, 200).path("data");
            require(saved.path("firstName").asText().equals("Updated") && saved.path("email").asText().equals("buyer@example.test"), "Rejected email changes must roll back all edits");
            edit.remove("email"); edit.put("firstName", "x".repeat(256));
            call("PUT", "/users", edit, token, 400);
            var accounts = context.getBean(com.example.creatshop.repository.UserRepository.class);
            var socialIdentities = context.getBean(com.example.creatshop.social.SocialIdentityRepository.class);
            var profileTransaction = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
            profileTransaction.executeWithoutResult(status -> {
                var account = accounts.findByUsername("httpbuyer").orElseThrow();
                var identity = new com.example.creatshop.social.SocialIdentity();
                identity.setUser(account); identity.setProvider("google"); identity.setSubject("local-linked-fixture");
                socialIdentities.save(identity);
            });
            require(call("GET", "/users/me", null, token, 200).path("data").path("passwordConfigured").asBoolean(), "Linking Google must not hide an existing local password");
            profileTransaction.executeWithoutResult(status -> {
                var account = accounts.findByUsername("httpbuyer").orElseThrow();
                account.setPasswordConfigured(null); accounts.save(account);
            });
            require(call("GET", "/users/me", null, token, 200).path("data").path("passwordConfigured").isNull(), "Legacy linked accounts must not be guessed from their username or provider");
            login("Review9!Pass");
            call("GET", "/users/me", null, token, 200);
            call("PUT", "/users/me/password", Map.of("currentPassword", "Wrong9!Pass", "newPassword", "Changed9!Pass"), token, 400);
            call("PUT", "/users/me/password", Map.of("newPassword", "Changed9!Pass"), token, 400);
            call("PUT", "/users/me/password", Map.of("currentPassword", "Review9!Pass", "newPassword", "weak"), token, 400);
            call("PUT", "/users/me/password", Map.of("currentPassword", "Review9!Pass", "newPassword", "Changed9!Pass"), token, 204);
            call("GET", "/users/me", null, token, 401);
            call("POST", "/auths/login", Map.of("username", "httpbuyer", "password", "Review9!Pass"), null, 401);
            token = login("Changed9!Pass");
            require(call("GET", "/users/me", null, token, 200).path("data").path("passwordConfigured").asBoolean(), "Changing a legacy password must persist its configured state");
            var address = Map.of("firstName", "Buyer", "lastName", "Test", "phoneNumber", "0900000000", "country", "VN",
                    "city", "City", "district", "District", "commune", "Commune", "addressDetail", "Historical address");
            int addressId = call("POST", "/addresses", address, token, 201).path("data").path("id").asInt();
            var variant = new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).execute(transaction -> {
                Product product = context.getBean(ProductRepository.class).save(Product.builder().name("HTTP shirt").price(BigDecimal.valueOf(100))
                        .imageStaticUrl("image").imageDynamicUrl("image").build());
                return context.getBean(ProductVariantRepository.class).save(ProductVariant.builder().product(product)
                        .quantity(3).color("black").size("M").build());
            });
            int payment = call("POST", "/payments", Map.of("amount", 100, "provider", "COD", "status", "PENDING"), token, 201).path("data").path("id").asInt();
            var order = Map.of("paymentId", payment, "addressId", addressId, "orderItems", List.of(
                    Map.of("productId", variant.getProduct().getId(), "variantId", variant.getId(), "quantity", 1)));
            int orderId = call("POST", "/orders", order, token, 201).path("data").path("id").asInt();
            for (Object invalidAmount : List.of(0, -1, 1.5, 1000000000000000L, "NaN", "Infinity")) {
                call("POST", "/payments", Map.of("amount", invalidAmount, "provider", "VNPAY", "status", "PENDING"), token, 400);
            }
            int vnpayPayment = call("POST", "/payments", Map.of("amount", 100, "provider", "VNPAY", "status", "PENDING"), token, 201).path("data").path("id").asInt();
            int vnpayOrder = call("POST", "/orders", Map.of("paymentId", vnpayPayment, "addressId", addressId,
                    "orderItems", order.get("orderItems")), token, 201).path("data").path("id").asInt();
            var fields = new TreeMap<String, String>(Map.of("vnp_Amount", "10000", "vnp_ResponseCode", "00",
                    "vnp_TransactionStatus", "00", "vnp_TmnCode", "REGRESSION", "vnp_TxnRef", String.valueOf(vnpayPayment)));
            String query = fields.entrySet().stream().map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII)
                    + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII)).collect(Collectors.joining("&"));
            String ipn = "/vnpay/ipn?" + query + "&vnp_SecureHash=" + VNPayUtil.hmacSHA512("regression-only-vnpay-secret", query);
            require("00".equals(call("GET", ipn, null, null, 200).path("RspCode").asText()), "Anonymous IPN did not confirm payment");
            require("COMPLETED".equals(call("GET", "/orders/" + vnpayOrder, null, token, 200).path("data").path("payment").path("status").asText()),
                    "IPN without browser return did not update the order");
            require("02".equals(call("GET", ipn, null, null, 200).path("RspCode").asText()), "IPN replay was not idempotent");
            require(context.getBean(ProductVariantRepository.class).findById(variant.getId()).orElseThrow().getQuantity() == 1,
                    "IPN replay changed reserved stock");
            call("PUT", "/orders/" + vnpayPayment, Map.of(), token, 400);
            int latePayment = call("POST", "/payments", Map.of("amount", 100, "provider", "VNPAY", "status", "PENDING"), token, 201).path("data").path("id").asInt();
            call("POST", "/orders", Map.of("paymentId", latePayment, "addressId", addressId,
                    "orderItems", order.get("orderItems")), token, 201);
            call("PUT", "/orders/" + latePayment, Map.of(), token, 200);
            fields.put("vnp_TxnRef", String.valueOf(latePayment));
            String lateQuery = fields.entrySet().stream().map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII)
                    + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII)).collect(Collectors.joining("&"));
            lateQuery += "&vnp_SecureHash=" + VNPayUtil.hmacSHA512("regression-only-vnpay-secret", lateQuery);
            var lateReturn = call("GET", "/vnpay/return?" + lateQuery, null, null, 200);
            require("ERROR".equals(lateReturn.path("meta").path("status").asText())
                    && "REFUND_REQUIRED".equals(lateReturn.path("data").path("paymentStatus").asText()), "Late return must explicitly report manual reconciliation");
            require(context.getBean(ProductVariantRepository.class).findById(variant.getId()).orElseThrow().getQuantity() == 1,
                    "Late payment reserved released stock again");
            call("DELETE", "/addresses/" + addressId, null, token, 200);
            require(call("GET", "/addresses", null, token, 200).path("data").isEmpty(), "Archived address is still selectable");
            var stored = call("GET", "/orders/" + orderId, null, token, 200).path("data");
            require(stored.path("addressSnapshotAvailable").asBoolean()
                    && "Historical address".equals(stored.path("address").path("addressDetail").asText()), "Recipient snapshot was lost");
            call("GET", "/addresses/" + addressId, null, token, 400);
            call("PUT", "/addresses/" + addressId, address, token, 400);
            call("POST", "/orders", order, token, 400);
            System.out.println("PASS: " + passed + " real HTTP assertions on isolated H2; application database untouched.");
        }
    }

    private static String login(String password) throws Exception {
        return call("POST", "/auths/login", Map.of("username", "httpbuyer", "password", password), null, 200)
                .path("data").path("accessToken").asText();
    }

    private static JsonNode call(String method, String path, Object body, String token, int expected) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(base + path)).timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
        if (token != null) request.header("Authorization", "Bearer " + token);
        var response = CLIENT.send(request.build(), HttpResponse.BodyHandlers.ofString());
        require(response.statusCode() == expected, method + " " + path + " expected " + expected + " but got " + response.statusCode() + ": " + response.body());
        passed++;
        return response.body().isBlank() ? JSON.nullNode() : JSON.readTree(response.body());
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
