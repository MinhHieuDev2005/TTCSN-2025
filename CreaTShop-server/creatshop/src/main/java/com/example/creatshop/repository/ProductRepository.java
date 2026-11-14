package com.example.creatshop.repository;

import com.example.creatshop.domain.entity.Category;
import com.example.creatshop.domain.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    boolean existsByCategoryId(Integer categoryId);
    long countByCategoryId(Integer categoryId);
    void deleteAllByCategory(Category category);
}
