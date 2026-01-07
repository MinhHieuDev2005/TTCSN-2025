package com.example.creatshop.domain.dto.request;


import com.example.creatshop.constant.ErrorMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductVariantRequest {

    @Schema(description = "Màu sắc của biến thể sản phẩm", example = "Đỏ")
    @NotBlank(message = ErrorMessage.Validate.ERR_VARIANT_COLOR_NOT_BLANK)
    @Size(max = 50, message = ErrorMessage.Validate.ERR_VARIANT_COLOR_MAX)
    String color;

    @Schema(description = "Kích thước của biến thể sản phẩm", example = "L")
    @NotBlank(message = ErrorMessage.Validate.ERR_VARIANT_SIZE_NOT_BLANK)
    @Size(max = 100, message = ErrorMessage.Validate.ERR_VARIANT_SIZE_SIZE)
    String size;

    @Schema(description = "Số lượng của biến thể sản phẩm", example = "100")
    @NotNull(message = ErrorMessage.Validate.ERR_QUANTITY_NOT_NULL)
    @Min(value = 1, message = ErrorMessage.Validate.ERR_QUANTITY_MIN)
    Integer quantity;

    @Schema(description = "Hình ảnh của biến thể sản phẩm", type = "string", format = "binary")
    @NotNull(message = ErrorMessage.Validate.ERR_PRODUCT_IMAGE_NOT_BLANK)
    MultipartFile image;
}
