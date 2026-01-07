package com.example.creatshop.service.impl;

import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.RoleType;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.UserRequest;
import com.example.creatshop.domain.dto.request.UserUpdateRequest;
import com.example.creatshop.domain.dto.response.AddressResponse;
import com.example.creatshop.domain.dto.response.UserResponse;
import com.example.creatshop.domain.entity.Cart;
import com.example.creatshop.domain.entity.Role;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.domain.mapper.AddressMapper;
import com.example.creatshop.domain.mapper.UserMapper;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.exception.SQLUniqueException;
import com.example.creatshop.repository.CartRepository;
import com.example.creatshop.repository.RoleRepository;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.service.UserService;
import io.jsonwebtoken.lang.Strings;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Log4j2
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserServiceImpl implements UserService {
    UserRepository userRepository;
    RoleRepository roleRepository;
    CartRepository cartRepository;

    UserMapper    userMapper;
    AddressMapper addressMapper;

    PasswordEncoder passwordEncoder;

    @Override
    public GlobalResponse<Meta, UserResponse> createUser(UserRequest request) {

        User user = userMapper.toUser(request);

        if (!roleRepository.existsByType(RoleType.ROLE_USER)) {
            Role role = Role.builder()
                            .type(RoleType.ROLE_USER)
                            .description("This is role for user")
                            .build();

            roleRepository.save(role);
        }

        Role role = roleRepository.findByType(RoleType.ROLE_USER)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.Role.NOT_FOUND_BY_TYPE));
        user.setRole(role);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setStatus(AccountStatus.ACTIVE);

        User savedUser = null;
        try {
            savedUser = userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            throw new SQLUniqueException(ErrorMessage.Common.ALREADY_EXIST_NAME);
        }

        if (Objects.isNull(savedUser.getCart())) {
            Cart cart = Cart.builder()
                    .build();

            savedUser.addCart(cart);

            cartRepository.save(cart);
        }

        UserResponse response = userMapper.toUserResponse(savedUser);

        return GlobalResponse
                .<Meta, UserResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    @Override
    public GlobalResponse<Meta, UserResponse> updateUser(UserUpdateRequest request, String username) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        userMapper.updateUser(request, user);

        userRepository.save(user);
        UserResponse response = userMapper.toUserResponse(user);

        return GlobalResponse
                .<Meta, UserResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    @Override
    public GlobalResponse<Meta, UserResponse> getUser(String username) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        UserResponse response = userMapper.toUserResponse(user);
        response.setAddress(getAddress(user));

        return GlobalResponse
                .<Meta, UserResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    @Override
    public GlobalResponse<Meta, List<UserResponse>> getUsers() {
        List<UserResponse> responses = new ArrayList<>();

        List<User> users = userRepository.findAll();
        users.forEach(user -> {
            UserResponse response = userMapper.toUserResponse(user);
            response.setAddress(getAddress(user));

            responses.add(response);
        });

        return GlobalResponse
                .<Meta, List<UserResponse>>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(responses)
                .build();
    }

    @Override
    public GlobalResponse<Meta, UserResponse> bannedAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_ID));

        user.setStatus(AccountStatus.BANNED);

        user = userRepository.save(user);

        UserResponse response = userMapper.toUserResponse(user);

        return GlobalResponse.<Meta, UserResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    @Override
    public GlobalResponse<Meta, UserResponse> unBannedAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_ID));

        user.setStatus(AccountStatus.ACTIVE);

        user = userRepository.save(user);

        UserResponse response = userMapper.toUserResponse(user);

        return GlobalResponse.<Meta, UserResponse>builder()
                .meta(Meta.builder().status(Status.SUCCESS).build())
                .data(response)
                .build();
    }

    private List<AddressResponse> getAddress(User user) {
        List<AddressResponse> responses = new ArrayList<>();
        for(var item : user.getAddresses()) {
            AddressResponse response = addressMapper.toAddressResponse(item);
            responses.add(response);
        }
        return responses;
    }
}
