package com.example.creatshop.service.impl;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.CartItemRequest;
import com.example.creatshop.domain.dto.response.CartItemResponse;
import com.example.creatshop.domain.entity.*;
import com.example.creatshop.domain.mapper.CartItemMapper;
import com.example.creatshop.domain.mapper.ProductMapper;
import com.example.creatshop.domain.mapper.ProductVariantMapper;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.repository.*;
import com.example.creatshop.service.CartItemService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Log4j2
public class CartItemServiceImpl implements CartItemService {
    CartItemRepository       cartItemRepository;
    UserRepository           userRepository;
    ProductRepository        productRepository;
    ProductVariantRepository variantRepository;
    CartItemMapper           cartItemMapper;
    ProductMapper            productMapper;
    ProductVariantMapper     variantMapper;


    @Override
    public GlobalResponse<Meta, CartItemResponse> addCartItem(String username, CartItemRequest request) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        if (Objects.isNull(request.getQuantity()) || request.getQuantity() <= 0) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_QUANTITY_COUNT);
        }

        Product product = productRepository.findById(request.getProductId())
                                           .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));

        ProductVariant variant = variantRepository.findById(request.getVariantId())
                                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.ProductVariant.NOT_FOUND_BY_ID));
        boolean flag = false;
        for (var item : product.getProductVariants()) {
            if (item.getId().equals(variant.getId())) {
                flag = true;
            }
        }

        if (flag == false) {
            throw new BadRequestException(ErrorMessage.Product.ERR_NOT_CONTAIN_VARIANT);
        }

        CartItem cartItem = CartItem.builder()
                                    .product(product)
                                    .productVariant(variant)
                                    .cart(user.getCart())
                                    .quantity(request.getQuantity())
                                    .build();

        cartItem = cartItemRepository.save(cartItem);

        CartItemResponse response = cartItemMapper.toCartItemResponse(cartItem);
        response.setProductResponse(productMapper.toProductResponse(cartItem.getProduct()));
        response.setProductDetail(variantMapper.toProductVariantResponse(cartItem.getProductVariant()));

        return GlobalResponse.<Meta, CartItemResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, List<CartItemResponse>> getCartItem(String username) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        List<CartItemResponse> responses = user.getCart().getCartItems()
                                               .stream()
                                               .map(item -> {
                                                   CartItemResponse response = CartItemResponse.builder()
                                                                                               .id(item.getId())
                                                                                               .quantity(item.getQuantity())
                                                                                               .build();
                                                   response.setProductResponse(productMapper.toProductResponse(item.getProduct()));
                                                   response.setProductDetail(variantMapper.toProductVariantResponse(item.getProductVariant()));
                                                   return response;
                                               })
                                               .collect(Collectors.toList());

        return GlobalResponse.<Meta, List<CartItemResponse>>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(responses)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, CartItemResponse> getCartItemById(String username, Integer id) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        CartItem cartItem = cartItemRepository.findById(id)
                                                      .orElseThrow(() -> new NotFoundException(ErrorMessage.CartItem.ERR_NOT_FOUND_BY_ID));

        List<CartItem> list = user.getCart().getCartItems();
        boolean flag = checkItemInCart(id, list);

        if (!flag) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_NOT_FOUND_CART_ITEM);
        }

        CartItemResponse response = CartItemResponse.builder()
                                                    .id(cartItem.getId())
                                                    .quantity(cartItem.getQuantity())
                                                    .productDetail(variantMapper.toProductVariantResponse(cartItem.getProductVariant()))
                                                    .productResponse(productMapper.toProductResponse(cartItem.getProduct()))
                                                    .build();

        return GlobalResponse.<Meta, CartItemResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, CartItemResponse> updateCartItem(String username, Integer id, CartItemRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));


        List<CartItem> list = user.getCart().getCartItems();
        boolean flag = checkItemInCart(id, list);

        if (!flag) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_NOT_FOUND_CART_ITEM);
        }

        CartItem cartItem = cartItemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.CartItem.ERR_NOT_FOUND_BY_ID));
        cartItem.setQuantity(request.getQuantity());

        cartItem = cartItemRepository.save(cartItem);

        CartItemResponse response = cartItemMapper.toCartItemResponse(cartItem);
        response.setProductDetail(variantMapper.toProductVariantResponse(cartItem.getProductVariant()));
        response.setProductResponse(productMapper.toProductResponse(cartItem.getProduct()));

        return GlobalResponse.<Meta, CartItemResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, String> deleteCartItem(String username, Integer id) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        boolean flag = checkItemInCart(id, user.getCart().getCartItems());

        if (!flag) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_NOT_FOUND_CART_ITEM);
        }

        cartItemRepository.deleteById(id);

        return GlobalResponse.<Meta, String>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data("Delete cart item successfully!")
                             .build();
    }

    private boolean checkItemInCart(Integer id, List<CartItem> list) {
        boolean flag = false;

        for (var item : list) {
            if (item.getId().equals(id)) {
                flag = true;
            }
        }
        return flag;
    }

}
