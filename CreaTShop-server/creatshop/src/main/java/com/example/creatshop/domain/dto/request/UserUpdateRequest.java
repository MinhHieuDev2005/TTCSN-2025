package com.example.creatshop.domain.dto.request;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.valid.ValidPhoneNumber;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Date;



@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserUpdateRequest {
    @NotBlank(message = ErrorMessage.Validate.ERR_FIRSTNAME_NOT_BLANK)
    @Size(max = 255)
    String firstName;

    @NotBlank(message = ErrorMessage.Validate.ERR_LASTNAME_NOT_BLANK)
    @Size(max = 255)
    String lastName;

    @Email(message = ErrorMessage.Validate.ERR_EMAIL_FORMAT)
    String email;

    @ValidPhoneNumber
    String phoneNumber;

    Date dateOfBirth;
}
