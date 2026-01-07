package com.example.creatshop.util;


import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageSourceUtils {
    MessageSource messageSource;

    public String getLocalizedMessage(String message, Object... args){
        return messageSource.getMessage(message, args, LocaleContextHolder.getLocale());
    }
}
