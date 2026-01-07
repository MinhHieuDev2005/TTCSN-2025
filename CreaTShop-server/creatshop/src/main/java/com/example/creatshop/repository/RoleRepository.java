package com.example.creatshop.repository;


import com.example.creatshop.constant.RoleType;
import com.example.creatshop.domain.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
    boolean existsByType(RoleType type);
    Optional<Role> findByType(RoleType type);
}
