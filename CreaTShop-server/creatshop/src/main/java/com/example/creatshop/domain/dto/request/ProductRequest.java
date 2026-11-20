package com.example.creatshop.domain.dto.request;

import com.example.creatshop.constant.ErrorMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductRequest {

    @Schema(description = "Tên sản phẩm", example = "Giày thể thao")
    @NotBlank(message = ErrorMessage.Validate.ERR_PRODUCT_NAME_NOT_NULL)
    @Size(min = 3, max = 100, message = ErrorMessage.Validate.ERR_PRODUCT_NAME_LENGTH)
    String name;

    @Size(max = 4000, message = "exception.discovery.description-length")
    @Schema(description = "Plain-text product description")
    String description;

    @Size(max = 200, message = "exception.discovery.attribute-length")
    String material;

    @Size(max = 200, message = "exception.discovery.attribute-length")
    String style;

    @Size(max = 200, message = "exception.discovery.attribute-length")
    String occasion;

    @Schema(description = "Giá sản phẩm", example = "120000")
    @NotNull(message = ErrorMessage.Validate.ERR_PRODUCT_PRICE_NOT_NULL)
    @DecimalMin(value = "1", message = ErrorMessage.Validate.ERR_VND_AMOUNT)
    @DecimalMax(value = "999999999999999", message = ErrorMessage.Validate.ERR_VND_AMOUNT)
    BigDecimal price;

    @Schema(description = "Hình ảnh tĩnh của sản phẩm", type = "string", format = "binary")
    @NotNull(groups = ProductValidation.Create.class, message = ErrorMessage.Validate.ERR_PRODUCT_IMAGE_NOT_BLANK)
    MultipartFile staticImg;

    @Schema(description = "Hình ảnh động của sản phẩm", type = "string", format = "binary")
    @NotNull(groups = ProductValidation.Create.class, message = ErrorMessage.Validate.ERR_PRODUCT_DIMAGE_NOT_BLANK)
    MultipartFile dynamicImg;

    @Schema(description = "ID danh mục sản phẩm", example = "1")
    @NotNull(message = ErrorMessage.Validate.ERR_CATEGORY_ID_NOT_BLANK)
    @Min(value = 1, message = ErrorMessage.Validate.ERR_CATEGORY_ID_MIN)
    Integer categoryId;

    // ✅ danh sách biến thể
    @Valid
    List<ProductVariantRequest> variants;
}
