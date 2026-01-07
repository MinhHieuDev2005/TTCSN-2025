package com.example.creatshop.repository;

import com.example.creatshop.constant.CategoryType;
import com.example.creatshop.domain.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    boolean existsByType(CategoryType type);
    boolean existsByName(String name);
}
