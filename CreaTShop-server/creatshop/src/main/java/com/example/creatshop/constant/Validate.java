package com.example.creatshop.constant;

public interface Validate {

    interface Auth {

        String PASSWORD_PATTERN     = "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[!@#$%^&*()_+=<>?/{}~|-]).{8,16}$";
        String PHONE_NUMBER_PATTERN = "^0\\d{9,14}$";
    }
}
