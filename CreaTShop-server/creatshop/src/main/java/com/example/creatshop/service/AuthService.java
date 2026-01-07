package com.example.creatshop.service;


import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.LoginRequest;
import com.example.creatshop.domain.dto.response.AuthResponse;

public interface AuthService {

    GlobalResponse<Meta, AuthResponse> login(LoginRequest request);


}
