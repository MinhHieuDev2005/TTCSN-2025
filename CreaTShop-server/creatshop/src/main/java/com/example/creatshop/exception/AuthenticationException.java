package com.example.creatshop.exception;


import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;

@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
public class AuthenticationException extends RuntimeException {
    String     message;
    HttpStatus status;
    String[]   params;

    public AuthenticationException(String message) {
        this.message = message;
        status = HttpStatus.FORBIDDEN;
    }
}
