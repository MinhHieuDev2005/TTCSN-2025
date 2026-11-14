package com.example.creatshop.repository;

import com.example.creatshop.domain.entity.Product;
import com.example.creatshop.domain.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from ProductVariant v where v.id = :id")
    Optional<ProductVariant> findByIdForUpdate(@Param("id") Integer id);

    @Modifying(flushAutomatically = true)
    @Query("update ProductVariant v set v.quantity = v.quantity - :quantity "
            + "where v.id = :id and :quantity > 0 and v.quantity >= :quantity")
    int reserveStock(@Param("id") Integer id, @Param("quantity") int quantity);

    @Modifying(flushAutomatically = true)
    @Query("update ProductVariant v set v.quantity = v.quantity + :quantity "
            + "where v.id = :id and :quantity > 0 and v.quantity is not null")
    int releaseStock(@Param("id") Integer id, @Param("quantity") int quantity);

    List<ProductVariant> findAllByProduct(Product product);
    void deleteAllByProduct(Product product);
    long countByProduct(Product product);

}
