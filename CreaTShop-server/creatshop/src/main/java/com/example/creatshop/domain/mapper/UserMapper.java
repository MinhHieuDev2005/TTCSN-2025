package com.example.creatshop.domain.mapper;


import com.example.creatshop.domain.dto.request.UserRequest;
import com.example.creatshop.domain.dto.request.UserUpdateRequest;
import com.example.creatshop.domain.dto.response.UserResponse;
import com.example.creatshop.domain.entity.User;
import org.mapstruct.*;


@Mapper(componentModel = "spring",
        nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {
    User toUser(UserRequest request);
    @Mapping(target = "role", source = "role.type")
    UserResponse toUserResponse(User user);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "firstName", source = "firstName")
    @Mapping(target = "lastName", source = "lastName")
    @Mapping(target = "phoneNumber", source = "phoneNumber")
    @Mapping(target = "dateOfBirth", source = "dateOfBirth")
    void updateUser(UserUpdateRequest request, @MappingTarget User user);
}
