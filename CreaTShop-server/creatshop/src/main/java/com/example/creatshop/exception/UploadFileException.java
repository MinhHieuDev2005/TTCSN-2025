package com.example.creatshop.exception;


import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UploadFileException extends RuntimeException {
    String message;
    HttpStatus status;

    public UploadFileException(String message) {
        this.message = message;
        status = HttpStatus.BAD_REQUEST;
    }
}
