package com.example.creatshop.exception;


import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SQLUniqueException extends DataIntegrityViolationException {
    String message;
    HttpStatus status;

    public SQLUniqueException(String msg) {
        super(msg);
        message = msg;
        status = HttpStatus.BAD_REQUEST;
    }
}
