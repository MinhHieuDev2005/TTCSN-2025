package com.example.creatshop.repository;


import com.example.creatshop.domain.entity.OrderItem;
import com.example.creatshop.domain.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {
    void deleteAllByVariant(ProductVariant variant);
}
