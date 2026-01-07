package com.example.creatshop.repository;

import com.example.creatshop.domain.entity.Category;
import com.example.creatshop.domain.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    void deleteAllByCategory(Category category);
}
