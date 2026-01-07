package com.example.creatshop.service.impl;


import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.constant.Validate;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.LoginRequest;
import com.example.creatshop.domain.dto.response.AuthResponse;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.exception.AuthenticationException;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.service.AuthService;
import com.example.creatshop.util.JwtUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Log4j2
public class AuthServiceImpl implements AuthService {
    UserRepository userRepository;

    AuthenticationManager authenticationManager;

    JwtUtils        jwtUtils;
    PasswordEncoder passwordEncoder;

    @Override
    public GlobalResponse<Meta, AuthResponse> login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        String accessToken = jwtUtils.generateJwtToken(authentication);
        User loggedUser = (User) authentication.getPrincipal();

        if (AccountStatus.ACTIVE.equals(loggedUser.getStatus())) {
            String roles = loggedUser
                    .getAuthorities()
                    .stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.joining(","));


            return GlobalResponse
                    .<Meta, AuthResponse>builder()
                    .meta(Meta.builder().status(Status.SUCCESS).build())
                    .data(AuthResponse.builder()
                            .accessToken(accessToken)
                            .roles(roles)
                            .type("Bearer").build())
                    .build();
        }
        throw new AuthenticationException(ErrorMessage.Auth.ERR_ACCOUNT_BANNED);

    }
}
