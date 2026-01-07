package com.example.creatshop.domain.dto.request;


import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Validate;
import com.example.creatshop.valid.ValidPhoneNumber;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Date;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserRequest {
    @NotBlank(message = ErrorMessage.Validate.ERR_FIRSTNAME_NOT_BLANK)
    String firstName;

    @NotBlank(message = ErrorMessage.Validate.ERR_LASTNAME_NOT_BLANK)
    String lastName;

    @NotBlank(message = ErrorMessage.Validate.ERR_USERNAME_NOT_BLANK)
    String username;

    @NotBlank(message = ErrorMessage.Validate.ERR_PASSWORD_NOT_BLANK)
    @Pattern(regexp = Validate.Auth.PASSWORD_PATTERN, message = ErrorMessage.Validate.ERR_PASSWORD_FORMAT)
    String password;

    @NotBlank(message = ErrorMessage.Validate.ERR_EMAIL_NOT_BLANK)
    @Email(message = ErrorMessage.Validate.ERR_EMAIL_FORMAT)
    String email;

    @ValidPhoneNumber
    String phoneNumber;

    Date dateOfBirth;
}
