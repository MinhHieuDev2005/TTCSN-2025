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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartItemServiceImpl implements CartItemService {
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final CartItemMapper cartItemMapper;
    private final ProductMapper productMapper;
    private final ProductVariantMapper variantMapper;

    @Override
    @Transactional
    public GlobalResponse<Meta, CartItemResponse> addCartItem(String username, CartItemRequest request) {
        Cart cart = lockedCart(username);
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_QUANTITY_COUNT);
        }
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Product.NOT_FOUND_BY_ID));
        ProductVariant variant = variantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new NotFoundException(ErrorMessage.ProductVariant.NOT_FOUND_BY_ID));
        if (variant.getProduct() == null || !product.getId().equals(variant.getProduct().getId())) {
            throw new BadRequestException(ErrorMessage.Product.ERR_NOT_CONTAIN_VARIANT);
        }
        List<CartItem> existing = cartItemRepository.findAllByCartAndProductVariant(cart, variant);
        long quantity = request.getQuantity().longValue();
        for (CartItem item : existing) quantity += item.getQuantity();
        if (quantity > Integer.MAX_VALUE) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_QUANTITY_COUNT);
        }
        CartItem item = existing.isEmpty() ? CartItem.builder().cart(cart).product(product)
                .productVariant(variant).build() : existing.get(0);
        item.setQuantity((int) quantity);
        if (existing.size() > 1) cartItemRepository.deleteAll(existing.subList(1, existing.size()));
        return GlobalResponse.<Meta, CartItemResponse>builder().meta(Meta.builder().status(Status.SUCCESS).build())
                .data(toResponse(cartItemRepository.save(item))).build();
    }

    @Override
    public GlobalResponse<Meta, List<CartItemResponse>> getCartItem(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));
        return GlobalResponse.<Meta, List<CartItemResponse>>builder().meta(Meta.builder().status(Status.SUCCESS).build())
                .data(user.getCart().getCartItems().stream().map(this::toResponse).toList()).build();
    }

    @Override
    public GlobalResponse<Meta, CartItemResponse> getCartItemById(String username, Integer id) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));
        return GlobalResponse.<Meta, CartItemResponse>builder().meta(Meta.builder().status(Status.SUCCESS).build())
                .data(toResponse(ownedItem(user.getCart(), id))).build();
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, CartItemResponse> updateCartItem(String username, Integer id, CartItemRequest request) {
        CartItem item = ownedItem(lockedCart(username), id);
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_QUANTITY_COUNT);
        }
        if (!item.getProduct().getId().equals(request.getProductId())
                || !item.getProductVariant().getId().equals(request.getVariantId())) {
            throw new BadRequestException(ErrorMessage.Product.ERR_NOT_CONTAIN_VARIANT);
        }
        item.setQuantity(request.getQuantity());
        return GlobalResponse.<Meta, CartItemResponse>builder().meta(Meta.builder().status(Status.SUCCESS).build())
                .data(toResponse(cartItemRepository.save(item))).build();
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, String> deleteCartItem(String username, Integer id) {
        return deleteCartItem(username, id, null);
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, String> deleteCartItem(String username, Integer id, Integer expectedQuantity) {
        CartItem item = ownedItem(lockedCart(username), id);
        if (expectedQuantity != null && expectedQuantity <= 0) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_QUANTITY_COUNT);
        }
        boolean unchanged = expectedQuantity == null || expectedQuantity.equals(item.getQuantity());
        if (unchanged) cartItemRepository.delete(item);
        return GlobalResponse.<Meta, String>builder().meta(Meta.builder().status(Status.SUCCESS).build())
                .data(unchanged ? "Cart item removed" : "Changed cart item preserved").build();
    }

    private Cart lockedCart(String username) {
        return cartRepository.findByUsernameForUpdate(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));
    }

    private CartItem ownedItem(Cart cart, Integer id) {
        CartItem item = cartItemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.CartItem.ERR_NOT_FOUND_BY_ID));
        if (item.getCart() == null || !cart.getId().equals(item.getCart().getId())) {
            throw new BadRequestException(ErrorMessage.CartItem.ERR_NOT_FOUND_CART_ITEM);
        }
        return item;
    }

    private CartItemResponse toResponse(CartItem item) {
        CartItemResponse response = cartItemMapper.toCartItemResponse(item);
        response.setProductResponse(productMapper.toProductResponse(item.getProduct()));
        response.setProductDetail(variantMapper.toProductVariantResponse(item.getProductVariant()));
        return response;
    }
}
