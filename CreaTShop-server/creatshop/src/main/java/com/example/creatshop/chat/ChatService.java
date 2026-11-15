package com.example.creatshop.chat;

import com.example.creatshop.constant.RoleType;
import com.example.creatshop.domain.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {
    private final ChatRepository messages;
    private final EntityManager entityManager;
    private final ApplicationEventPublisher events;

    public record Message(Long id, String customerId, String customerName, boolean fromShop,
                          String text, Instant sentAt, String clientMessageId, long unreadCount) {}
    public record Changed(String customerId) {}
    public record ReadChanged(String viewerId) {}
    public record Inbox(List<Message> items, boolean hasMore) {}
    public record Unread(long messageCount, int threadCount, Message latestIncoming) {}

    public static boolean isAdmin(User actor) {
        return actor.getRole().getType() == RoleType.ROLE_ADMIN;
    }

    private String customerId(User actor, String requested) {
        if (!isAdmin(actor)) {
            if (requested != null && !requested.equals(actor.getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            return actor.getId();
        }
        if (requested == null || requested.isBlank() || requested.length() > 36) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return requested;
    }

    private Message view(ChatMessage message) {
        return view(message, 0);
    }

    private Message view(ChatMessage message, long unreadCount) {
        User customer = message.getCustomer();
        return new Message(message.getId(), customer.getId(), customer.getFirstName() + " " + customer.getLastName(),
                message.isFromShop(), message.getText(), message.getSentAt(), message.getClientMessageId(), unreadCount);
    }

    public List<Message> history(User actor, String requested, Long beforeId, Long afterId) {
        String customer = customerId(actor, requested);
        if ((beforeId != null && beforeId <= 0) || (afterId != null && afterId < 0) || (beforeId != null && afterId != null))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var result = afterId == null
                ? new ArrayList<>(messages.findByCustomerIdAndIdLessThanOrderByIdDesc(customer, beforeId == null ? Long.MAX_VALUE : beforeId, PageRequest.of(0, 50)))
                : messages.findByCustomerIdAndIdGreaterThanOrderByIdAsc(customer, afterId, PageRequest.of(0, 50));
        if (afterId == null) Collections.reverse(result);
        return result.stream().map(this::view).toList();
    }

    public Inbox inbox(User actor, int page) {
        if (page < 0 || page > 10000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var result = messages.inbox(PageRequest.of(page, 30));
        var unread = messages.unread(actor.getId(), false, true).stream().collect(java.util.stream.Collectors.toMap(
                ChatRepository.UnreadThread::getCustomerId, ChatRepository.UnreadThread::getUnreadCount));
        return new Inbox(result.stream().map(message -> view(message, unread.getOrDefault(message.getCustomer().getId(), 0L))).toList(), result.size() == 30);
    }

    public Unread unread(User actor) {
        boolean admin = isAdmin(actor);
        var counts = messages.unread(actor.getId(), !admin, admin);
        var latest = messages.latestIncoming(actor.getId(), !admin, admin, PageRequest.of(0, 1));
        return new Unread(counts.stream().mapToLong(ChatRepository.UnreadThread::getUnreadCount).sum(), counts.size(),
                latest.isEmpty() ? null : view(latest.get(0)));
    }

    @Transactional
    public void markRead(User actor, String requested, Long lastReadId) {
        String customer = customerId(actor, requested);
        if (lastReadId == null || lastReadId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        ChatMessage message = messages.findById(lastReadId).filter(item -> item.getCustomer().getId().equals(customer))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST));
        User viewer = entityManager.find(User.class, actor.getId(), LockModeType.PESSIMISTIC_WRITE);
        var result = entityManager.createQuery("select r from ChatRead r where r.viewer.id = :viewer and r.customer.id = :customer", ChatRead.class)
                .setParameter("viewer", actor.getId()).setParameter("customer", customer).getResultList();
        ChatRead read = result.isEmpty() ? new ChatRead() : result.get(0);
        if (read.getLastReadId() >= lastReadId) return;
        read.setViewer(viewer);
        read.setCustomer(message.getCustomer());
        read.setLastReadId(lastReadId);
        if (read.getId() == null) entityManager.persist(read);
        events.publishEvent(new ReadChanged(actor.getId()));
    }

    @Transactional
    public Message send(User actor, String requested, String clientMessageId, String text) {
        if (text == null || text.isBlank() || text.length() > 2000 || clientMessageId == null
                || !clientMessageId.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String customerId = customerId(actor, requested);
        User customer = entityManager.find(User.class, customerId, LockModeType.PESSIMISTIC_WRITE);
        if (customer == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (isAdmin(customer)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String content = text.strip();
        var previous = messages.findByCustomerIdAndSenderIdAndClientMessageId(customerId, actor.getId(), clientMessageId);
        if (previous.isPresent()) {
            if (!previous.get().getText().equals(content)) throw new ResponseStatusException(HttpStatus.CONFLICT);
            return view(previous.get());
        }
        if (!customer.isEnabled()) throw new ResponseStatusException(HttpStatus.CONFLICT);
        var recent = messages.findFirstByCustomerIdAndSenderIdOrderByIdDesc(customerId, actor.getId());
        if (recent.isPresent() && recent.get().getSentAt().isAfter(Instant.now().minusSeconds(1)))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        ChatMessage message = new ChatMessage();
        message.setCustomer(customer);
        message.setSender(actor);
        message.setFromShop(isAdmin(actor));
        message.setText(content);
        message.setClientMessageId(clientMessageId);
        message.setSentAt(Instant.now());
        messages.saveAndFlush(message);
        events.publishEvent(new Changed(customerId));
        return view(message);
    }
}
