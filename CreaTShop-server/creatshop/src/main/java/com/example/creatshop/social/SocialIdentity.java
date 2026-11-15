package com.example.creatshop.social;

import com.example.creatshop.domain.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "social_identities", uniqueConstraints = @UniqueConstraint(name = "uk_social_subject", columnNames = {"provider", "subject"}))
public class SocialIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 16, updatable = false)
    private String provider;

    @Column(nullable = false, updatable = false)
    private String subject;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;
}
