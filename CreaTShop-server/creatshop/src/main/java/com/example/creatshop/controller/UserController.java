package com.example.creatshop.controller;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.UserRequest;
import com.example.creatshop.domain.dto.request.UserUpdateRequest;
import com.example.creatshop.domain.dto.response.UserResponse;
import com.example.creatshop.service.UserService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Log4j2
@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "User API", description = "API quản lý người dùng")
public class UserController {
    UserService userService;

    @Operation(summary = "Tạo người dùng mới", description = "Tạo một người dùng mới với thông tin chi tiết trong yêu cầu.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Người dùng đã được tạo thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Yêu cầu không hợp lệ",
                         content = @Content(mediaType = "application/json"))
    })
    @PostMapping(Endpoint.V1.User.CREATE_USER)
    public ResponseEntity<GlobalResponse<Meta, UserResponse>> createUser(@RequestBody @Valid UserRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(userService.createUser(request));
    }

    @Operation(summary = "Cập nhật thông tin người dùng", description = "Cập nhật thông tin của người dùng hiện tại.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Thông tin người dùng đã được cập nhật thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy người dùng",
                         content = @Content(mediaType = "application/json"))
    })
    @PutMapping(Endpoint.V1.User.UPDATE_USER)
    public ResponseEntity<GlobalResponse<Meta, UserResponse>> updateUser(@RequestBody @Valid UserUpdateRequest request,
                                                                         @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(userService.updateUser(request, userDetails.getUsername()));
    }

    @Operation(summary = "Lấy thông tin người dùng hiện tại", description = "Truy xuất thông tin người dùng đã xác thực.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Thông tin người dùng đã được truy xuất thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "404", description = "Không tìm thấy người dùng",
                         content = @Content(mediaType = "application/json"))
    })
    @GetMapping(Endpoint.V1.User.GET_USER)
    public ResponseEntity<GlobalResponse<Meta, UserResponse>> getUser(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(userService.getUser(userDetails.getUsername()));
    }

    @Operation(summary = "Lấy danh sách tất cả người dùng", description = "Truy xuất danh sách tất cả người dùng. Chỉ có thể truy cập bởi người dùng có vai trò 'ADMIN'.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Danh sách người dùng đã được truy xuất thành công",
                         content = @Content(mediaType = "application/json",
                                            schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "403", description = "Truy cập bị từ chối",
                         content = @Content(mediaType = "application/json"))
    })
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping(Endpoint.V1.User.GET_USERS)
    public ResponseEntity<GlobalResponse<Meta, List<UserResponse>>> getUsers() {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(userService.getUsers());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping(Endpoint.V1.User.BANNED_ACCOUNT)
    public ResponseEntity<GlobalResponse<Meta, UserResponse>> bannedAccount(@PathVariable(name = "userId") String userId,
                                                                            @RequestParam Boolean isLocked) {
        if (isLocked) {
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(userService.bannedAccount(userId));
        }else{
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(userService.unBannedAccount(userId));
        }

    }
}
