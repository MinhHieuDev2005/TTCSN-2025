package com.example.creatshop.service.impl;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.OrderStatus;
import com.example.creatshop.constant.PaymentStatus;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.OrderItemRequest;
import com.example.creatshop.domain.dto.request.OrderRequest;
import com.example.creatshop.domain.dto.response.OrderDetailResponse;
import com.example.creatshop.domain.dto.response.OrderItemResponse;
import com.example.creatshop.domain.dto.response.PaymentResponse;
import com.example.creatshop.domain.entity.*;
import com.example.creatshop.domain.mapper.*;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.repository.*;
import com.example.creatshop.service.OrderDetailService;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Log4j2
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrderDetailServiceImpl implements OrderDetailService {
    OrderDetailRepository    orderDetailRepository;
    OrderItemRepository      orderItemRepository;
    ProductRepository        productRepository;
    ProductVariantRepository variantRepository;
    PaymentDetailRepository  paymentDetailRepository;
    UserRepository           userRepository;
    OrderDetailMapper        orderDetailMapper;
    OrderItemMapper          orderItemMapper;
    ProductMapper            productMapper;
    ProductVariantMapper     variantMapper;
    UserMapper               userMapper;
    PaymentMapper            paymentMapper;

    @Override
    public GlobalResponse<Meta, OrderDetailResponse> createOrder(String username, OrderRequest request) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        PaymentDetail paymentDetail = paymentDetailRepository.findById(request.getPaymentId())
                                                             .orElseThrow(() -> new NotFoundException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        OrderDetail orderDetail = new OrderDetail();
        orderDetail.setUser(user);
        orderDetail.setPaymentDetail(paymentDetail);

        List<OrderItem> orderItems = new ArrayList<>();
        Double total = 0.0;

        for (var item : request.getOrderItems()) {
            Product product = productRepository.findById(item.getProductId())
                                               .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));

            ProductVariant variant = variantRepository.findById(item.getVariantId())
                                                      .orElseThrow(() -> new NotFoundException(ErrorMessage.ProductVariant.NOT_FOUND_BY_ID));

            if (variant.getQuantity() < item.getQuantity()) {
                throw new IllegalArgumentException(ErrorMessage.OrderDetail.ERR_QUANTITY_CANNOT_BIGGER_STOCK);
            }

            OrderItem orderItem = OrderItem.builder()
                                           .product(product)
                                           .variant(variant)
                                           .orderDetail(orderDetail)
                                           .quantity(item.getQuantity())
                                           .build();

            total ++;

            variant.setQuantity(variant.getQuantity() - item.getQuantity());
            variantRepository.save(variant);

            orderItems.add(orderItem);
        }

        orderDetail.setTotal(total);
        orderDetail.setStatus(OrderStatus.Processing);

        orderDetail = orderDetailRepository.save(orderDetail);

        paymentDetail.setOrderDetail(orderDetail);
        paymentDetailRepository.save(paymentDetail);

        orderItems = new ArrayList<>(orderItemRepository.saveAll(orderItems));

        OrderDetailResponse response = orderDetailMapper.toOrderDetailResponse(orderDetail);
        response.setOrderItems(orderItems.stream()
                                         .map(orderItem -> {
                                             OrderItemResponse itemResponse = orderItemMapper.toOrderItemResponse(orderItem);
                                             itemResponse.setProduct(productMapper.toProductResponse(orderItem.getProduct()));
                                             itemResponse.setVariant(variantMapper.toProductVariantResponse(orderItem.getVariant()));

                                             return itemResponse;
                                         })
                                         .collect(Collectors.toList())
        );
        response.setUser(userMapper.toUserResponse(user));
        response.setStatus(orderDetail.getStatus().name());
        response.setPayment(paymentMapper.toPaymentResponse(paymentDetail));

        return GlobalResponse.<Meta, OrderDetailResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }


    @Override
    public GlobalResponse<Meta, PaymentResponse> cancelOrder(String username, Integer id) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        PaymentDetail paymentDetail = paymentDetailRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Payment.ERR_NOT_FOUND_BY_ID));

        if (!paymentDetail.getStatus().equals(PaymentStatus.PENDING)) {
            throw new IllegalArgumentException(ErrorMessage.Payment.ERR_ONLY_PENDING_CAN_CANCEL);
        }

        List<OrderItem> orderItems = paymentDetail.getOrderDetail().getItems();

        for (OrderItem orderItem : orderItems) {
            ProductVariant variant = orderItem.getVariant();
            variant.setQuantity(variant.getQuantity() + orderItem.getQuantity());
            variantRepository.save(variant);
        }

        paymentDetail.setStatus(PaymentStatus.CANCELED);
        paymentDetail = paymentDetailRepository.save(paymentDetail);

        PaymentResponse response = paymentMapper.toPaymentResponse(paymentDetail);

        return GlobalResponse.<Meta, PaymentResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, List<OrderDetailResponse>> getOrders(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        List<OrderDetail> orderDetails = orderDetailRepository.findAllByUser(user);


        List<OrderDetailResponse> responses = orderDetails.stream()
                                                          .map(orderDetail -> {
                                                              OrderDetailResponse response = orderDetailMapper.toOrderDetailResponse(orderDetail);
                                                              List<OrderItemResponse> items = orderDetail.getItems()
                                                                                                         .stream()
                                                                                                         .map(orderItem -> orderItemMapper.toOrderItemResponse(orderItem))
                                                                                                         .collect(Collectors.toList());
                                                              response.setOrderItems(items);
                                                              response.setPayment(paymentMapper.toPaymentResponse(orderDetail.getPaymentDetail()));

                                                              return response;
                                                          })
                                                          .toList();

        return GlobalResponse.<Meta, List<OrderDetailResponse>>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(responses)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, OrderDetailResponse> getOrder(Integer id) {
        OrderDetail orderDetail = orderDetailRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.OrderDetail.ERR_NOT_FOUND_BY_ID));

        OrderDetailResponse response = orderDetailMapper.toOrderDetailResponse(orderDetail);
        response.setStatus(orderDetail.getStatus().name());

        return GlobalResponse.<Meta, OrderDetailResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    @Transactional
    @Override
    public GlobalResponse<Meta, OrderDetailResponse> moveToNextStatus(Integer id) {
        OrderDetail orderDetail = orderDetailRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.OrderDetail.ERR_NOT_FOUND_BY_ID));

        orderDetail.moveToNextStatus();

        orderDetail = orderDetailRepository.save(orderDetail);

        OrderDetailResponse response = orderDetailMapper.toOrderDetailResponse(orderDetail);
        response.setStatus(orderDetail.getStatus().name());

        return GlobalResponse.<Meta, OrderDetailResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    @Transactional
    @Override
    public GlobalResponse<Meta, OrderDetailResponse> moveToPreviousStatus(Integer id) {
        OrderDetail orderDetail = orderDetailRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.OrderDetail.ERR_NOT_FOUND_BY_ID));

        orderDetail.moveToPreviousStatus();

        orderDetail = orderDetailRepository.save(orderDetail);

        OrderDetailResponse response = orderDetailMapper.toOrderDetailResponse(orderDetail);
        response.setStatus(orderDetail.getStatus().name());

        return GlobalResponse.<Meta, OrderDetailResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    private Double calculatorTotal(Integer productId, Integer quantity) {
        Product product = productRepository.findById(productId)
                                           .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));

        Double price = product.getPrice();

        return price * quantity;
    }
}
