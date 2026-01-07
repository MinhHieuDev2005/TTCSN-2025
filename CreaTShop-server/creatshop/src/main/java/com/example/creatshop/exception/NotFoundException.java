package com.example.creatshop.exception;


import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;

@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
public class NotFoundException extends RuntimeException {
    String message;
    HttpStatus status;
    String[] params;

    public NotFoundException(String message) {
        this.message = message;
        status = HttpStatus.NOT_FOUND;
    }
}
