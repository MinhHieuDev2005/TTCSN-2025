package com.example.creatshop.service.impl;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.domain.dto.request.AddressRequest;
import com.example.creatshop.domain.dto.response.AddressResponse;
import com.example.creatshop.domain.entity.Address;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.domain.mapper.AddressMapper;
import com.example.creatshop.exception.BadRequestException;
import com.example.creatshop.exception.NotFoundException;
import com.example.creatshop.repository.AddressRepository;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.service.AddressService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;


@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Log4j2
public class AddressServiceImpl implements AddressService {
    AddressRepository addressRepository;
    UserRepository    userRepository;
    AddressMapper     addressMapper;

    @Override
    public GlobalResponse<Meta, AddressResponse> createAddress(String username, AddressRequest request) {
        User user = userRepository.findByUsername(username)
                                  .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        Address address = addressMapper.toAddress(request);
        address.addUser(user);

        address = addressRepository.save(address);

        AddressResponse response = addressMapper.toAddressResponse(address);

        return GlobalResponse.<Meta, AddressResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, List<AddressResponse>> getAddress(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        List<AddressResponse> responses = new ArrayList<>();
        for (var item : user.getAddresses()) {
            responses.add(addressMapper.toAddressResponse(item));
        }

        return GlobalResponse.<Meta, List<AddressResponse>>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(responses)
                             .build();
    }

    @Override
    public GlobalResponse<Meta, AddressResponse> getAddressById(String username, Integer id) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        boolean check = checkAddress(user.getAddresses(), id);

        if (!check) {
            throw new BadRequestException(ErrorMessage.Address.ERR_NOT_FOUND_ADDRESS);
        }

        Address address = addressRepository.findById(id).orElseThrow(() -> new NotFoundException(ErrorMessage.Address.ERR_NOT_FOUND_BY_ID));

        AddressResponse response = addressMapper.toAddressResponse(address);

        return GlobalResponse.<Meta, AddressResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    @Override
    @Transactional
    public GlobalResponse<Meta, String> deleteAddress(String username, Integer id) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));

        boolean check = checkAddress(user.getAddresses(), id);

        if (!check) {
            throw new BadRequestException(ErrorMessage.Address.ERR_NOT_FOUND_ADDRESS);
        }

        Address address = addressRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.Address.ERR_NOT_FOUND_BY_ID));

        user.getAddresses().remove(address);

        return GlobalResponse.<Meta, String>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data("Delete address successfully!")
                             .build();
    }

    @Override
    public GlobalResponse<Meta, AddressResponse> updateAddress(String username, Integer id, AddressRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException(ErrorMessage.User.ERR_NOT_FOUND_USERNAME));
        boolean check = checkAddress(user.getAddresses(), id);

        if (!check) {
            throw new BadRequestException(ErrorMessage.Address.ERR_NOT_FOUND_ADDRESS);
        }

        Address address = addressRepository.findById(id)
                                           .orElseThrow(() -> new NotFoundException(ErrorMessage.Address.ERR_NOT_FOUND_BY_ID));

        addressMapper.updateAddress(request, address);

        address = addressRepository.save(address);

        AddressResponse response = addressMapper.toAddressResponse(address);

        return GlobalResponse.<Meta, AddressResponse>builder()
                             .meta(Meta.builder().status(Status.SUCCESS).build())
                             .data(response)
                             .build();
    }

    private boolean checkAddress(List<Address> addresses, Integer id) {
        for (var item : addresses) {
            if (item.getId().equals(id)) {
                return true;
            }
        }
        return false;
    }
}
