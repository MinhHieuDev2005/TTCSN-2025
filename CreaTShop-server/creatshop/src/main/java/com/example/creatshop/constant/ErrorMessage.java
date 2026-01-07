package com.example.creatshop.constant;

public interface ErrorMessage {

    interface Path {
        String WRONG_PATH = "exception.path.wrong";
    }

    interface Auth {
        String ERR_INVALID_TOKEN     = "exception.auth.invalid-token";
        String ERR_EXPIRED_SESSION   = "exception.auth.expired-session";
        String ERR_UNSUPPORTED_TOKEN = "exception.auth.unsupported-token";
        String ERR_INVALID_SIGNATURE = "exception.auth.invalid.signature";
        String ERR_NOT_LOGIN         = "exception.auth.not-login";
        String ERR_MISSING_PREFIX    = "exception.auth.missing-prefix";
        String ERR_FORBIDDEN         = "exception.auth.forbidden";
        String ERR_ACCOUNT_BANNED    = "exception.auth.account-banned";

    }

    interface Validate {
        String ERR_USERNAME_NOT_BLANK      = "exception.validate.username.not-blank";
        String ERR_PASSWORD_NOT_BLANK      = "exception.validate.password.not-blank";
        String ERR_PASSWORD_FORMAT         = "exception.validate.password.format";
        String ERR_FIRSTNAME_NOT_BLANK     = "exception.validate.firstName.not-blank";
        String ERR_LASTNAME_NOT_BLANK      = "exception.validate.lastName.not-blank";
        String ERR_EMAIL_FORMAT            = "exception.validate.email.format";
        String ERR_PHONE_FORMAT            = "exception.validate.phoneNumber.format";
        String ERR_CATEGORY_NAME_NOT_EMPTY = "exception.validate.category.name-not-empty";
        String ERR_CATEGORY_TYPE_NOT_EMPTY = "exception.validate.category.type-not-empty";
        String ERR_EMAIL_NOT_BLANK         = "exception.validate.email.not-blank";
        String ERR_PHONE_NUMBER_NOT_BLANK  = "exception.validate.phoneNumber.not-blank";
        String ERR_FIRSTNAME_SIZE          = "exception.validate.firstName.size";
        String ERR_LASTNAME_SIZE           = "exception.validate.lastName.size";
        String ERR_COUNTRY_NOT_BLANK       = "exception.validate.country.not-blank";
        String ERR_CITY_NOT_BLANK          = "exception.validate.city.not-blank";
        String ERR_DISTRICT_NOT_BLANK      = "exception.validate.district.not-blank";
        String ERR_COMMUNE_NOT_BLANK       = "exception.validate.commune.not-blank";
        String ERR_ADDRESS_DETAIL_NOT_BLANK= "exception.validate.addressDetail.not-blank";
        String ERR_ADDRESS_DETAIL_SIZE     = "exception.validate.addressDetail.size";
        String ERR_DESCRIPTION_SIZE        = "exception.validate.description.size";
        String ERR_PRODUCT_ID_NOT_NULL     =  "exception.validate.productId.not-null";
        String ERR_PRODUCT_ID_MIN          = "exception.validate.productId.min";
        String ERR_VARIANT_ID_NOT_NULL = "exception.validate.variantId.not-null";
        String ERR_VARIANT_ID_MIN = "exception.validate.variantId.min";
        String ERR_QUANTITY_NOT_NULL = "exception.validate.quantity.not-null";
        String ERR_QUANTITY_MIN = "exception.validate.quantity.min";
        String ERR_PAYMENT_ID_NOT_NULL = "exception.validate.paymentId.not-null";
        String ERR_PAYMENT_ID_MIN = "exception.validate.paymentId.min";
        String ERR_ORDER_ITEMS_NOT_NULL = "exception.validate.orderItems.not-null";
        String ERR_ORDER_ITEM_NOT_NULL = "exception.validate.orderItem.not-null";
        String ERR_AMOUNT_NOT_NULL = "exception.validate.amount.not-null";
        String ERR_AMOUNT_POSITIVE = "exception.validate.amount.positive";
        String ERR_PROVIDER_NOT_NULL = "exception.validate.provider.not-null";
        String ERR_STATUS_NOT_NULL = "exception.validate.status.not-null";
        String ERR_STATUS_INVALID = "exception.validate.status.invalid";
        String ERR_PRODUCT_NAME_NOT_NULL = "exception.validate.name.not-blank";
        String ERR_PRODUCT_NAME_LENGTH = "exception.validate.name.size";
        String ERR_PRODUCT_PRICE_NOT_NULL = "exception.validate.price.not-blank";
        String ERR_PRODUCT_PRICE_MIN = "exception.validate.price.min";
        String ERR_PRODUCT_IMAGE_NOT_BLANK = "exception.validate.staticImg.not-blank";
        String ERR_PRODUCT_DIMAGE_NOT_BLANK = "exception.validate.dynamicImg.not-blank";
        String ERR_CATEGORY_ID_NOT_BLANK = "exception.validate.categoryId.not-blank";
        String ERR_CATEGORY_ID_MIN = "exception.validate.categoryId.min";
        String ERR_VARIANT_COLOR_NOT_BLANK = "exception.validate.color.not-blank";
        String ERR_VARIANT_COLOR_MAX = "exception.validate.color.size";
        String ERR_VARIANT_SIZE_NOT_BLANK = "exception.validate.size.not-blank";
        String ERR_VARIANT_SIZE_SIZE = "exception.validate.size.size";
        String ERR_PROVIDER_NOT_BLANK = "exception.validate.provider.not-blank";
    }

    public interface Role {
        String NOT_FOUND_BY_TYPE = "exception.role.not-found";
    }

    public interface User {
        String ERR_NOT_FOUND_USERNAME      = "exception.user.not-found-username";
        String ERR_CAN_NOT_UPDATE_USERNAME = "exception.user.not-update-username";
        String ERR_NOT_FOUND_ID = "exception.user.not-found-id";
    }

    public interface Category {
        String EXISTS_BY_NAME  = "exception.category.exist-by-name";
        String NOT_FOUND_TYPE  = "exception.category.not-found-type";
        String NOT_FOUND_BY_ID = "exception.category.not-found-id";
    }

    public interface Common {
        String ALREADY_EXIST_NAME = "exception.common.exist-by-name";
        String NOT_FOUND_CATEGORY = "exception.common.not-found-category";
    }

    public interface Product {
        String ERR_FILE_UPLOAD         = "exception.product.file-format";
        String NOT_FOUND_BY_ID         = "exception.product.not-found-by-id";
        String ERR_NOT_CONTAIN_VARIANT = "exception.product.not-contain-variant";
    }

    public interface ProductVariant {
        String NOT_FOUND_BY_ID = "exception.variant.not-found-by-id";
    }

    public interface CartItem {
        String ERR_QUANTITY_COUNT      = "exception.cart-item.quantity-count";
        String ERR_NOT_FOUND_BY_ID     = "exception.cart-item.not-found-by-id";
        String ERR_NOT_FOUND_CART_ITEM = "exception.cart-item.not-found";
    }

    public interface Address {
        String ERR_NOT_FOUND_ADDRESS = "exception.address.not-found";
        String ERR_NOT_FOUND_BY_ID   = "exception.address.not-found-id";
    }

    public interface Payment {
        String ERR_NOT_FOUND_BY_ID = "exception.payment.not-found-id";
        String ERR_ONLY_PENDING_CAN_CANCEL = "exception.payment.only-cancel";
    }

    public interface OrderDetail {
        String ERR_NOT_FOUND_BY_ID = "exception.order.not-found-id";
        String ERR_ORDER_STATUS_COMPLETED = "exception.order.status.completed";
        String ERR_ORDER_STATUS_FIRST = "exception.order.status.first";
        String ERR_QUANTITY_CANNOT_BIGGER_STOCK = "exception.order.quantity-over";
    }
}
