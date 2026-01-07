package com.example.creatshop.domain.dto.global;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class GlobalResponse<Meta, Data> {
    Meta meta;
    Data data;
}
