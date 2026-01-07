package com.example.creatshop.security.jwt;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.util.JwtUtils;
import com.example.creatshop.util.MessageSourceUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Log4j2
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {
    ObjectMapper       objectMapper;
    MessageSourceUtils messageSourceUtils;
    JwtUtils           jwtUtils;

    @NonFinal
    String AUTH_PREFIX = "Bearer ";

    @NonFinal
    String AUTH_HEADER = "Authorization";


    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        String authHeader = request.getHeader(AUTH_HEADER);

        String message = null;

        if (authHeader == null || authHeader.isBlank()) {
            message = ErrorMessage.Auth.ERR_NOT_LOGIN;
        }

        if (authHeader != null && !authHeader.startsWith(AUTH_PREFIX)) {
            message = ErrorMessage.Auth.ERR_MISSING_PREFIX;
        }

        if (message == null) {
            message = jwtUtils.checkToken(authHeader.substring(AUTH_PREFIX.length()).trim());

        }

        if (message == null) {
            message = ErrorMessage.Path.WRONG_PATH;
        }
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        GlobalResponse<Meta, Void> responseBody = GlobalResponse
                .<Meta, Void>builder()
                .meta(Meta
                        .builder()
                        .status(Status.ERROR)
                        .message(messageSourceUtils.getLocalizedMessage(message))
                          .build())
                .build();

        objectMapper.writeValue(response.getOutputStream(), responseBody);
    }
}
