package com.example.creatshop.chat;

import com.example.creatshop.domain.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "chat_reads", uniqueConstraints = @UniqueConstraint(name = "uk_chat_reader", columnNames = {"viewer_id", "customer_id"}))
@Getter
@Setter
@NoArgsConstructor
public class ChatRead {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viewer_id", nullable = false)
    private User viewer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;
    @Column(nullable = false)
    private long lastReadId;
}
