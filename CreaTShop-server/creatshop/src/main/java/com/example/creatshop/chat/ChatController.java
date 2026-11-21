package com.example.creatshop.chat;

import com.example.creatshop.domain.entity.User;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chat;
    private final ChatEvents events;
    public record SendRequest(String customerId, String clientMessageId, String text) {}
    public record ReadRequest(String customerId, Long lastReadId) {}

    @GetMapping("/threads")
    @PreAuthorize("hasRole('ADMIN')")
    public ChatService.Inbox inbox(@AuthenticationPrincipal User actor, @RequestParam(defaultValue = "0") int page) { return chat.inbox(actor, page); }

    @GetMapping("/unread")
    public ChatService.Unread unread(@AuthenticationPrincipal User actor) { return chat.unread(actor); }

    @PutMapping("/read")
    public void read(@AuthenticationPrincipal User actor, @RequestBody ReadRequest request) {
        chat.markRead(actor, request.customerId(), request.lastReadId());
    }

    @GetMapping("/messages")
    public List<ChatService.Message> history(@AuthenticationPrincipal User actor,
            @RequestParam(required = false) String customerId, @RequestParam(required = false) Long beforeId,
            @RequestParam(required = false) Long afterId) {
        return chat.history(actor, customerId, beforeId, afterId);
    }

    @PostMapping("/messages")
    public ChatService.Message send(@AuthenticationPrincipal User actor, @RequestBody SendRequest request) {
        return chat.send(actor, request.customerId(), request.clientMessageId(), request.text());
    }

    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal User actor, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Accel-Buffering", "no");
        return events.subscribe(actor);
    }
}
