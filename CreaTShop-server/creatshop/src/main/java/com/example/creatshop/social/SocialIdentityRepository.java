package com.example.creatshop.social;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SocialIdentityRepository extends JpaRepository<SocialIdentity, Long> {
    Optional<SocialIdentity> findByProviderAndSubject(String provider, String subject);
}
