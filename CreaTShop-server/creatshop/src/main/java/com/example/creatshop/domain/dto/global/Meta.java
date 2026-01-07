package com.example.creatshop.domain.dto.global;

import com.example.creatshop.constant.Status;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Meta {
    Status status;
    String message;
}
