package com.example.creatshop.chat;

import com.example.creatshop.domain.entity.User;
import jakarta.annotation.PreDestroy;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class ChatEvents {
    // ponytail: one server, at most 500 streams; use a shared event broker before adding replicas.
    private final CopyOnWriteArrayList<Connection> connections = new CopyOnWriteArrayList<>();
    private record Connection(String userId, boolean admin, Instant opened, SseEmitter emitter) {}

    public synchronized SseEmitter subscribe(User actor) {
        if (connections.size() >= 500 || connections.stream().filter(connection -> connection.userId().equals(actor.getId())).count() >= 5)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        SseEmitter emitter = new SseEmitter(60000L);
        Connection connection = new Connection(actor.getId(), ChatService.isAdmin(actor), Instant.now(), emitter);
        connections.add(connection);
        emitter.onCompletion(() -> connections.remove(connection));
        emitter.onTimeout(() -> close(connection));
        emitter.onError(error -> connections.remove(connection));
        send(connection, "ready");
        return emitter;
    }

    @TransactionalEventListener
    public void changed(ChatService.Changed event) {
        for (Connection connection : connections) {
            if (connection.admin() || connection.userId().equals(event.customerId())) send(connection, "change");
        }
    }

    @TransactionalEventListener
    public void read(ChatService.ReadChanged event) {
        for (Connection connection : connections) {
            if (connection.userId().equals(event.viewerId())) send(connection, "read");
        }
    }

    @Scheduled(fixedDelay = 15000)
    public void heartbeat() {
        for (Connection connection : connections) {
            if (connection.opened().isBefore(Instant.now().minusSeconds(45))) close(connection);
            else send(connection, "ping");
        }
    }

    private void send(Connection connection, String event) {
        try { connection.emitter().send(SseEmitter.event().name(event).data("refresh")); }
        catch (IOException | IllegalStateException error) { close(connection); }
    }

    private void close(Connection connection) {
        connections.remove(connection);
        connection.emitter().complete();
    }

    @PreDestroy
    public void stop() { connections.forEach(this::close); }
}
