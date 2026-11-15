package com.example.creatshop.domain.dto.request;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Validate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class PasswordChangeRequest {
    @NotBlank(message = ErrorMessage.Validate.ERR_PASSWORD_NOT_BLANK)
    private String currentPassword;

    @NotBlank(message = ErrorMessage.Validate.ERR_PASSWORD_NOT_BLANK)
    @Pattern(regexp = Validate.Auth.PASSWORD_PATTERN, message = ErrorMessage.Validate.ERR_PASSWORD_FORMAT)
    private String newPassword;
}
