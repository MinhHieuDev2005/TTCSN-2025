package com.example.creatshop.repository;


import com.example.creatshop.domain.entity.PaymentDetail;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentDetailRepository extends JpaRepository<PaymentDetail, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PaymentDetail p where p.id = :id")
    Optional<PaymentDetail> findByIdForUpdate(@Param("id") Integer id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PaymentDetail p where p.orderDetail.id = :orderId")
    Optional<PaymentDetail> findByOrderIdForUpdate(@Param("orderId") Integer orderId);

    @Query("select p.id from PaymentDetail p where p.provider = 'VNPAY' "
            + "and p.status = com.example.creatshop.constant.PaymentStatus.PENDING "
            + "and p.createdAt <= :cutoff order by p.id")
    List<Integer> findExpiredVnpayPaymentIds(@Param("cutoff") Timestamp cutoff, Pageable pageable);
}
