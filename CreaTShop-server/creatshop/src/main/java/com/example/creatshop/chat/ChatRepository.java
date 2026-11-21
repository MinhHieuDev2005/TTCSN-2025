package com.example.creatshop.chat;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ChatRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByCustomerIdAndIdLessThanOrderByIdDesc(String customerId, long beforeId, Pageable page);
    List<ChatMessage> findByCustomerIdAndIdGreaterThanOrderByIdAsc(String customerId, long afterId, Pageable page);
    Optional<ChatMessage> findByCustomerIdAndSenderIdAndClientMessageId(String customerId, String senderId, String clientMessageId);
    Optional<ChatMessage> findFirstByCustomerIdAndSenderIdOrderByIdDesc(String customerId, String senderId);
    @Query("select m from ChatMessage m where m.id in (select max(latest.id) from ChatMessage latest group by latest.customer.id) order by m.id desc")
    List<ChatMessage> inbox(Pageable page);

    interface UnreadThread {
        String getCustomerId();
        long getUnreadCount();
    }

    @Query("select m.customer.id as customerId, count(m) as unreadCount from ChatMessage m "
            + "where m.fromShop = :fromShop and (:admin = true or m.customer.id = :viewerId) "
            + "and m.id > coalesce((select r.lastReadId from ChatRead r where r.viewer.id = :viewerId and r.customer.id = m.customer.id), 0) "
            + "group by m.customer.id")
    List<UnreadThread> unread(String viewerId, boolean fromShop, boolean admin);

    @Query("select m from ChatMessage m where m.fromShop = :fromShop and (:admin = true or m.customer.id = :viewerId) order by m.id desc")
    List<ChatMessage> latestIncoming(String viewerId, boolean fromShop, boolean admin, Pageable page);
}
