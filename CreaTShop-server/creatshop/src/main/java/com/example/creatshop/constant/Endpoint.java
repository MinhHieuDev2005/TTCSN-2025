package com.example.creatshop.constant;

public interface Endpoint {

    interface V1 {
        String PREFIX = "/api/v1";

        interface Auth {
            String PREFIX = V1.PREFIX + "/auths";
            String LOGIN  = PREFIX + "/login";
        }

        public interface User {
            String PREFIX      = V1.PREFIX + "/users";
            String CREATE_USER = PREFIX;
            String UPDATE_USER = PREFIX;
            String GET_USER    = PREFIX + "/me";
            String GET_USERS   = PREFIX;
            String BANNED_ACCOUNT = PREFIX + "/{userId}";
        }

        public interface Category {
            String PREFIX             = V1.PREFIX + "/categories";
            String CREATE_CATEGORY    = PREFIX;
            String UPDATE_CATEGORY    = PREFIX + "/{id}";
            String DELETE_CATEGORY    = PREFIX + "/{id}";
            String GET_CATEGORY       = PREFIX;
            String GET_CATEGORY_BY_ID = PREFIX + "/{categoryId}";
        }

        public interface Product {
            String PREFIX            = V1.PREFIX + "/products";
            String CREATE_PRODUCT    = PREFIX;
            String GET_PRODUCT_BY_ID = PREFIX + "/{productId}";
            String GET_PRODUCT       = PREFIX;
            String UPDATE_PRODUCT    = PREFIX + "/{productId}";
            String DELETE_PRODUCT    = PREFIX + "/{productId}";
        }

        public interface Variant {
            String PREFIX                 = V1.PREFIX + "/variants";
            String CREATE_VARIANT         = PREFIX + "/{productId}";
            String GET_VARIANT_BY_PRODUCT = PREFIX + "/product/{productId}";
            String GET_VARIANT            = PREFIX;
            String GET_VARIANT_BY_ID      = PREFIX + "/{variantId}";
            String UPDATE_VARIANT         = PREFIX + "/{variantId}";
            String DELETE_VARIANT         = PREFIX + "/{variantId}";
        }

        public interface Cart {
            String PREFIX              = V1.PREFIX + "/carts";
            String ADD_CART_ITEM       = PREFIX;
            String GET_CART_ITEM       = PREFIX;
            String GET_CART_ITEM_BY_ID = PREFIX + "/{cartItemId}";
            String UPDATE_CART_ITEM    = PREFIX + "/{cartItemId}";
            String DELETE_CART_ITEM    = PREFIX + "/{cartItemId}";
        }

        public interface Address {
            String PREFIX            = V1.PREFIX + "/addresses";
            String ADD_ADDRESS       = PREFIX;
            String GET_ADDRESS       = PREFIX;
            String GET_ADDRESS_BY_ID = PREFIX + "/{addressId}";
            String DELETE_ADDRESS    = PREFIX + "/{addressId}";
            String UPDATE_ADDRESS    = PREFIX + "/{addressId}";
        }

        public interface Order {
            String PREFIX              = V1.PREFIX + "/orders";
            String CREATE_ORDER_DETAIL = PREFIX;
            String CANCEL_ORDER_DETAIL = PREFIX + "/{paymentId}";
            String GET_ORDER_BY_USER   = PREFIX;
            String GET_ORDER_STATUS = PREFIX + "/{orderId}";
            String MOVE_TO_NEXT_STATUS = PREFIX + "/{orderId}/status";
            String MOVE_TO_PREVIOUS_STATUS = PREFIX + "/{orderId}/status/prev";
        }

        public interface Payment {
            String PREFIX                = V1.PREFIX + "/payments";
            String CREATE_PAYMENT_METHOD = PREFIX;
            String UPDATE_PAYMENT_STATUS = PREFIX + "/{paymentId}";
        }
    }
}
