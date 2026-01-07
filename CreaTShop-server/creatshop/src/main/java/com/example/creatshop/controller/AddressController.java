package com.example.creatshop.controller;

import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.AddressRequest;
import com.example.creatshop.domain.dto.response.AddressResponse;
import com.example.creatshop.service.AddressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RestController
@Tag(name = "Address API", description = "Quản lý địa chỉ của người dùng")
public class AddressController {
    AddressService addressService;

    @Operation(summary = "Thêm địa chỉ mới", description = "Thêm địa chỉ mới cho người dùng hiện tại")
    @PostMapping(Endpoint.V1.Address.ADD_ADDRESS)
    public ResponseEntity<GlobalResponse<Meta, AddressResponse>> addAddress(@AuthenticationPrincipal UserDetails userDetails,
                                                                            @RequestBody @Valid AddressRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(addressService.createAddress(userDetails.getUsername(), request));
    }

    @Operation(summary = "Lấy tất cả địa chỉ", description = "Lấy tất cả địa chỉ của người dùng hiện tại")
    @GetMapping(Endpoint.V1.Address.GET_ADDRESS)
    public ResponseEntity<GlobalResponse<Meta, List<AddressResponse>>> getAddress(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(addressService.getAddress(userDetails.getUsername()));
    }

    @Operation(summary = "Lấy địa chỉ theo ID", description = "Lấy địa chỉ cụ thể của người dùng bằng ID")
    @GetMapping(Endpoint.V1.Address.GET_ADDRESS_BY_ID)
    public ResponseEntity<GlobalResponse<Meta, AddressResponse>> getAddressById(@AuthenticationPrincipal UserDetails userDetails,
                                                                                @PathVariable(name = "addressId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(addressService.getAddressById(userDetails.getUsername(), id));
    }

    @Operation(summary = "Xóa địa chỉ", description = "Xóa địa chỉ của người dùng bằng ID")
    @DeleteMapping(Endpoint.V1.Address.DELETE_ADDRESS)
    public ResponseEntity<GlobalResponse<Meta, String>> deleteAddress(@AuthenticationPrincipal UserDetails userDetails,
                                                                      @PathVariable(name = "addressId") Integer id) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(addressService.deleteAddress(userDetails.getUsername(), id));
    }

    @Operation(summary = "Cập nhật địa chỉ", description = "Cập nhật địa chỉ của người dùng bằng ID")
    @PutMapping(Endpoint.V1.Address.UPDATE_ADDRESS)
    public ResponseEntity<GlobalResponse<Meta, AddressResponse>> updateAddress(@AuthenticationPrincipal UserDetails userDetails,
                                                                               @PathVariable(name = "addressId") Integer id,
                                                                               @RequestBody @Valid AddressRequest request) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(addressService.updateAddress(userDetails.getUsername(), id, request));
    }
}
