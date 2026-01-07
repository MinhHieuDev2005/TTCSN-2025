package com.example.creatshop.service;


import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.AddressRequest;
import com.example.creatshop.domain.dto.response.AddressResponse;

import java.util.List;

public interface AddressService {
    GlobalResponse<Meta, AddressResponse> createAddress(String username, AddressRequest request);

    GlobalResponse<Meta, List<AddressResponse>> getAddress(String username);

    GlobalResponse<Meta, AddressResponse> getAddressById(String username, Integer id);

    GlobalResponse<Meta, String> deleteAddress(String username, Integer id);

    GlobalResponse<Meta, AddressResponse> updateAddress(String username, Integer id, AddressRequest request);
}
