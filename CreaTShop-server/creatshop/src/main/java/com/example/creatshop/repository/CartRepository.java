package com.example.creatshop.repository;

import com.example.creatshop.domain.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Cart c join c.user u where u.username = :username")
    Optional<Cart> findByUsernameForUpdate(String username);
}
