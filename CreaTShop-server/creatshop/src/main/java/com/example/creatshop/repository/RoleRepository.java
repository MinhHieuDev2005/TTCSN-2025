package com.example.creatshop.repository;


import com.example.creatshop.constant.RoleType;
import com.example.creatshop.domain.entity.Role;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select role from Role role where role.type = :type")
    Optional<Role> findByTypeForUpdate(@Param("type") RoleType type);

    boolean existsByType(RoleType type);
    Optional<Role> findByType(RoleType type);
}
