package com.example.creatshop.domain.mapper;


import com.example.creatshop.domain.dto.request.AddressRequest;
import com.example.creatshop.domain.dto.response.AddressResponse;
import com.example.creatshop.domain.entity.Address;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring",
        nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface AddressMapper {

    Address toAddress(AddressRequest request);

    AddressResponse toAddressResponse(Address address);

    void updateAddress(AddressRequest request, @MappingTarget Address address);
}
