package com.example.creatshop.domain.dto.request;

import com.example.creatshop.constant.ErrorMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductRequest {

    @Schema(description = "Tên sản phẩm", example = "Giày thể thao")
    @NotNull(message = ErrorMessage.Validate.ERR_PRODUCT_NAME_NOT_NULL)
    @Size(min = 3, max = 100, message = ErrorMessage.Validate.ERR_PRODUCT_NAME_LENGTH)
    String name;

    @Schema(description = "Giá sản phẩm", example = "120.5")
    @NotNull(message = ErrorMessage.Validate.ERR_PRODUCT_PRICE_NOT_NULL)
    @DecimalMin(value = "0.1", message = ErrorMessage.Validate.ERR_PRODUCT_PRICE_MIN)
    Double price;

    @Schema(description = "Hình ảnh tĩnh của sản phẩm", type = "string", format = "binary")
    @NotNull(message = ErrorMessage.Validate.ERR_PRODUCT_IMAGE_NOT_BLANK)
    MultipartFile staticImg;

    @Schema(description = "Hình ảnh động của sản phẩm", type = "string", format = "binary")
    @NotNull(message = ErrorMessage.Validate.ERR_PRODUCT_DIMAGE_NOT_BLANK)
    MultipartFile dynamicImg;

    @Schema(description = "ID danh mục sản phẩm", example = "1")
    @NotNull(message = ErrorMessage.Validate.ERR_CATEGORY_ID_NOT_BLANK)
    @Min(value = 1, message = ErrorMessage.Validate.ERR_CATEGORY_ID_MIN)
    Integer categoryId;

    // ✅ danh sách biến thể
    @Valid
    List<ProductVariantRequest> variants;
}
