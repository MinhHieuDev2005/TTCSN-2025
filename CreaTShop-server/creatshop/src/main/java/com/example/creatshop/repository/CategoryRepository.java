package com.example.creatshop.repository;

import com.example.creatshop.constant.CategoryType;
import com.example.creatshop.domain.entity.Category;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select category from Category category where category.id = :id")
    Optional<Category> findByIdForUpdate(@Param("id") Integer id);

    boolean existsByType(CategoryType type);
    boolean existsByName(String name);
}
