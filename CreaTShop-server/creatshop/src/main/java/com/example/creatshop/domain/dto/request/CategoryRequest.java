package com.example.creatshop.domain.dto.request;

import com.example.creatshop.constant.ErrorMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CategoryRequest {
    @NotBlank(message = ErrorMessage.Validate.ERR_CATEGORY_NAME_NOT_EMPTY)
    String name;

    String description;

    @NotBlank(message = ErrorMessage.Validate.ERR_CATEGORY_TYPE_NOT_EMPTY)
    String type;
}
