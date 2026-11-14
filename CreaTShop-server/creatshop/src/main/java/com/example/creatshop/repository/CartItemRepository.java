package com.example.creatshop.repository;


import com.example.creatshop.domain.entity.CartItem;
import com.example.creatshop.domain.entity.Product;
import com.example.creatshop.domain.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Integer> {
    boolean existsByProductVariant(ProductVariant variant);
    boolean existsByProduct(Product product);
}
