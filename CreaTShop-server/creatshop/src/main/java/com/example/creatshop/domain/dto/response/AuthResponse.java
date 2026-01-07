package com.example.creatshop.domain.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class AuthResponse {
    String accessToken;
    String type = "Bearer";
    String roles;

    public AuthResponse(String accessToken, String roles) {
        this.accessToken = accessToken;
        this.roles = roles;
    }
}
