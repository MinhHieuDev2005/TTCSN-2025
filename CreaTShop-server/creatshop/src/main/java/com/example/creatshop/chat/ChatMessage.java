package com.example.creatshop.chat;

import com.example.creatshop.domain.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = @Index(name = "idx_chat_customer_id", columnList = "customer_id,id"),
        uniqueConstraints = @UniqueConstraint(name = "uk_chat_retry", columnNames = {"customer_id", "sender_id", "client_message_id"}))
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;
    @Column(nullable = false)
    private boolean fromShop;
    @Column(nullable = false, length = 2000)
    private String text;
    @Column(nullable = false, length = 36)
    private String clientMessageId;
    @Column(nullable = false)
    private Instant sentAt;
}
