package com.example.creatshop;

import com.example.creatshop.chat.ChatRepository;
import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.constant.RoleType;
import com.example.creatshop.domain.entity.Role;
import com.example.creatshop.repository.RoleRepository;
import com.example.creatshop.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

public class ChatHttpChecks {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient CLIENT = HttpClient.newHttpClient();
    private static String base;
    private static int passed;

    public static void main(String[] args) throws Exception {
        try (var context = new SpringApplicationBuilder(CreatshopApplication.class).run(
                "--spring.config.location=optional:classpath:/chat-http-only.properties",
                "--server.address=127.0.0.1", "--server.port=0", "--debug=false",
                "--spring.datasource.url=jdbc:h2:mem:chat_http;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
                "--spring.datasource.driver-class-name=org.h2.Driver", "--spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
                "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.jpa.hibernate.ddl-auto=create-drop", "--spring.main.banner-mode=off",
                "--logging.level.root=ERROR", "--logging.level.org.springframework=ERROR",
                "--cloudinary.cloud_name=isolated", "--cloudinary.api_key=isolated", "--cloudinary.api_secret=isolated",
                "--vnp.url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "--vnp.return-url=http://localhost/payment-return", "--vnp.tmn-code=REGRESSION", "--vnp.hash-secret=regression-only-vnpay-secret",
                "--auth.token.jwtSecret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
                "--auth.token.expirationInMils=3600000", "--auth.token.refreshInMils=7200000")) {
            base = "http://127.0.0.1:" + ((ServletWebServerApplicationContext) context).getWebServer().getPort() + "/api/v1";
            String buyer = signup("chatbuyer");
            String stranger = signup("chatstranger");
            signup("chatadmin");
            signup("chatadmin2");
            UserRepository users = context.getBean(UserRepository.class);
            RoleRepository roles = context.getBean(RoleRepository.class);
            var transaction = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
            transaction.executeWithoutResult(status -> {
                var admin = users.findByUsername("chatadmin").orElseThrow();
                admin.setRole(roles.findByType(RoleType.ROLE_ADMIN).orElseGet(() -> roles.save(Role.builder().type(RoleType.ROLE_ADMIN).build())));
                users.save(admin);
                var otherAdmin = users.findByUsername("chatadmin2").orElseThrow();
                otherAdmin.setRole(admin.getRole()); users.save(otherAdmin);
            });
            String admin = login("chatadmin");
            String admin2 = login("chatadmin2");
            String buyerId = users.findByUsername("chatbuyer").orElseThrow().getId();
            String strangerId = users.findByUsername("chatstranger").orElseThrow().getId();
            call("GET", "/chat/messages", null, null, 401);
            call("GET", "/chat/events", null, null, 401);
            call("GET", "/chat/unread", null, null, 401);
            call("PUT", "/chat/read", Map.of("lastReadId", 1), null, 401);
            call("PUT", "/chat/read", Map.of(), buyer, 400);
            call("PUT", "/chat/read", Map.of("lastReadId", 0), buyer, 400);
            call("PUT", "/chat/read", Map.of("lastReadId", Long.MAX_VALUE), buyer, 400);
            call("GET", "/chat/threads", null, buyer, 403);
            call("GET", "/chat/messages?customerId=" + strangerId, null, buyer, 403);
            call("GET", "/chat/messages", null, admin, 400);
            call("GET", "/chat/messages?beforeId=-1", null, buyer, 400);
            call("POST", "/chat/messages", Map.of("text", "x", "clientMessageId", "bad"), buyer, 400);
            call("POST", "/chat/messages", request("   "), buyer, 400);
            call("POST", "/chat/messages", request("x".repeat(2001)), buyer, 400);
            var forged = new java.util.HashMap<>(request("forged"));
            forged.put("customerId", strangerId);
            call("POST", "/chat/messages", forged, buyer, 403);

            var opening = request("Hello <script>alert(1)</script>\nTu van san pham");
            var first = call("POST", "/chat/messages", opening, buyer, 200);
            require(!first.path("fromShop").asBoolean() && buyerId.equals(first.path("customerId").asText()), "Server must determine sender and ownership");
            long firstId = first.path("id").asLong();
            require(call("GET", "/chat/unread", null, buyer, 200).path("messageCount").asLong() == 0, "Own send must not create unread messages");
            require(call("GET", "/chat/unread", null, admin, 200).path("messageCount").asLong() == 1, "Customer send must notify admin");
            call("GET", "/chat/messages?customerId=" + buyerId, null, admin, 200);
            require(call("GET", "/chat/unread", null, admin, 200).path("threadCount").asInt() == 1, "Fetching history must not mark messages read");
            call("PUT", "/chat/read", Map.of("lastReadId", firstId), stranger, 400);
            call("PUT", "/chat/read", Map.of("customerId", buyerId, "lastReadId", firstId), stranger, 403);
            call("PUT", "/chat/read", Map.of("lastReadId", firstId), admin, 400);
            require(call("POST", "/chat/messages", opening, buyer, 200).path("id").asLong() == firstId, "Lost response retry duplicated message");
            var altered = new java.util.HashMap<>(opening);
            altered.put("text", "Changed contents");
            call("POST", "/chat/messages", altered, buyer, 409);
            call("POST", "/chat/messages", request("Too fast"), buyer, 429);
            require(call("GET", "/chat/messages", null, stranger, 200).isEmpty(), "Another customer can read chat");

            try (var buyerStream = stream(buyer); var adminStream = stream(admin); var strangerStream = stream(stranger); var otherAdminStream = stream(admin2)) {
                awaitEvent(buyerStream, "ready");
                awaitEvent(adminStream, "ready");
                awaitEvent(strangerStream, "ready");
                awaitEvent(otherAdminStream, "ready");
                var reply = new java.util.HashMap<>(request("Shop reply"));
                reply.put("customerId", buyerId);
                var answer = call("POST", "/chat/messages", reply, admin, 200);
                require(answer.path("fromShop").asBoolean(), "Admin response not attributed to shop");
                awaitEvent(buyerStream, "change");
                awaitEvent(adminStream, "change");
                awaitEvent(otherAdminStream, "change");
                Thread.sleep(150);
                require(!strangerStream.ready(), "Events leaked to another customer");
                var delta = call("GET", "/chat/messages?afterId=" + firstId, null, buyer, 200);
                require(delta.size() == 1 && "Shop reply".equals(delta.get(0).path("text").asText()), "Reconnect cursor lost new messages");
                require(call("GET", "/chat/threads", null, admin, 200).path("items").size() == 1, "Admin inbox missing customer");
                var unread = call("GET", "/chat/unread", null, buyer, 200);
                require(unread.path("messageCount").asLong() == 1 && unread.path("latestIncoming").path("id").asLong() == answer.path("id").asLong(), "Shop reply must notify only its customer");
                call("PUT", "/chat/read", Map.of("lastReadId", firstId), buyer, 200);
                awaitEvent(buyerStream, "read");
                require(call("GET", "/chat/unread", null, buyer, 200).path("messageCount").asLong() == 1, "Reading an older message must not clear a concurrent reply");
                call("PUT", "/chat/read", Map.of("lastReadId", answer.path("id").asLong()), buyer, 200);
                awaitEvent(buyerStream, "read");
                require(call("GET", "/chat/unread", null, buyer, 200).path("messageCount").asLong() == 0, "Read cursor must clear visible incoming messages");
                call("PUT", "/chat/read", Map.of("lastReadId", firstId), buyer, 200);
                require(call("GET", "/chat/unread", null, buyer, 200).path("messageCount").asLong() == 0, "Stale read must not move cursor backwards");
                call("PUT", "/chat/read", Map.of("customerId", buyerId, "lastReadId", firstId), admin, 200);
                awaitEvent(adminStream, "read");
                require(!otherAdminStream.ready() && !buyerStream.ready(), "Read event must only reach the viewer account");
                require(call("GET", "/chat/unread", null, admin, 200).path("threadCount").asInt() == 0, "Admin unread conversation must clear after reading");
                require(call("GET", "/chat/unread", null, admin2, 200).path("messageCount").asLong() == 1, "Admins must have independent read cursors");
                require(call("GET", "/chat/threads", null, admin2, 200).path("items").get(0).path("unreadCount").asLong() == 1, "Inbox must expose viewer unread count");
            }

            transaction.executeWithoutResult(status -> {
                var template = context.getBean(ChatRepository.class).findById(firstId).orElseThrow();
                for (int index = 0; index < 55; index++) {
                    var message = new com.example.creatshop.chat.ChatMessage();
                    message.setCustomer(template.getCustomer()); message.setSender(template.getSender());
                    message.setFromShop(false); message.setText("History " + index);
                    message.setClientMessageId(UUID.randomUUID().toString()); message.setSentAt(java.time.Instant.now());
                    context.getBean(ChatRepository.class).save(message);
                }
            });
            var latest = call("GET", "/chat/messages", null, buyer, 200);
            require(call("GET", "/chat/unread", null, login("chatadmin"), 200).path("messageCount").asLong() == 55, "Read cursor must persist across sessions and retain new messages");
            require(call("GET", "/chat/unread", null, stranger, 200).path("messageCount").asLong() == 0, "Unread summary leaked another conversation");
            require(latest.size() == 50 && latest.get(0).path("id").asLong() < latest.get(49).path("id").asLong(), "History must be bounded and chronological");
            var older = call("GET", "/chat/messages?beforeId=" + latest.get(0).path("id").asLong(), null, buyer, 200);
            require(older.size() == 7 && older.get(0).path("id").asLong() == firstId, "Older messages were lost");
            transaction.executeWithoutResult(status -> {
                var account = users.findByUsername("chatbuyer").orElseThrow();
                account.setStatus(AccountStatus.BANNED); users.save(account);
            });
            call("GET", "/chat/messages", null, buyer, 401);
            System.out.println("PASS: " + passed + " chat HTTP checks; real SSE, ownership, replies, retry, throttling, history and persistent per-account unread cursors on isolated H2.");
        }
    }

    private static Map<String, String> request(String text) { return Map.of("text", text, "clientMessageId", UUID.randomUUID().toString()); }

    private static String signup(String username) throws Exception {
        call("POST", "/users", Map.of("username", username, "password", "Review9!Pass", "firstName", username,
                "lastName", "Test", "email", username + "@example.test", "phoneNumber", "0900000000"), null, 201);
        return login(username);
    }

    private static String login(String username) throws Exception {
        return call("POST", "/auths/login", Map.of("username", username, "password", "Review9!Pass"), null, 200).path("data").path("accessToken").asText();
    }

    private static BufferedReader stream(String token) throws Exception {
        var response = CLIENT.send(HttpRequest.newBuilder(URI.create(base + "/chat/events")).header("Authorization", "Bearer " + token)
                .header("Accept", "text/event-stream").GET().build(), HttpResponse.BodyHandlers.ofInputStream());
        require(response.statusCode() == 200, "Cannot open chat stream: " + response.statusCode());
        return new BufferedReader(new InputStreamReader(response.body(), java.nio.charset.StandardCharsets.UTF_8));
    }

    private static void awaitEvent(BufferedReader reader, String event) throws Exception {
        var future = CompletableFuture.runAsync(() -> {
            try {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.equals("event:" + event)) {
                        while ((line = reader.readLine()) != null && !line.isEmpty()) { }
                        return;
                    }
                }
                throw new AssertionError("SSE closed before " + event);
            } catch (java.io.IOException error) { throw new RuntimeException(error); }
        });
        future.get(5, TimeUnit.SECONDS);
        passed++;
    }

    private static JsonNode call(String method, String path, Object body, String token, int expected) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(base + path)).timeout(Duration.ofSeconds(15)).header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
        if (token != null) request.header("Authorization", "Bearer " + token);
        var response = CLIENT.send(request.build(), HttpResponse.BodyHandlers.ofString());
        require(response.statusCode() == expected, method + " " + path + " expected " + expected + " but got " + response.statusCode() + ": " + response.body());
        passed++;
        return response.body().isBlank() ? JSON.nullNode() : JSON.readTree(response.body());
    }

    private static void require(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
