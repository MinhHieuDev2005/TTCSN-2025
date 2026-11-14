package com.example.creatshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CreatshopApplication {

    public static void main(String[] args) {
        SpringApplication.run(CreatshopApplication.class, args);
    }

}
