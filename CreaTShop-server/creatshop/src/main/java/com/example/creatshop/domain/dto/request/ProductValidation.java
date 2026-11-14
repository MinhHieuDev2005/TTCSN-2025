package com.example.creatshop.domain.dto.request;

import jakarta.validation.groups.Default;

public interface ProductValidation {
    interface Create extends Default {}
    interface Update extends Default {}
}
