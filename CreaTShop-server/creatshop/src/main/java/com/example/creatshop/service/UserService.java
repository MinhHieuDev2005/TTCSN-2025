package com.example.creatshop.service;

import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.UserRequest;
import com.example.creatshop.domain.dto.request.UserUpdateRequest;
import com.example.creatshop.domain.dto.response.UserResponse;

import java.util.List;

public interface UserService {
    GlobalResponse<Meta, UserResponse> createUser(UserRequest request);

    GlobalResponse<Meta, UserResponse> updateUser(UserUpdateRequest request, String username);

    GlobalResponse<Meta, UserResponse> getUser(String username);

    GlobalResponse<Meta, List<UserResponse>> getUsers();

    GlobalResponse<Meta, UserResponse> bannedAccount(String userId);

    GlobalResponse<Meta, UserResponse> unBannedAccount(String userId);
}
