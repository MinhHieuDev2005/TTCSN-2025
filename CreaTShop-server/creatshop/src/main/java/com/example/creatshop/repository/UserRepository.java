package com.example.creatshop.repository;


import com.example.creatshop.domain.entity.User;
import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.constant.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByUsername(String username);
    long countByRoleTypeAndStatus(RoleType role, AccountStatus status);
    boolean existsByUsername(String username);
}
