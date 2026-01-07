//package com.example.creatshop.config;
///*
// * @author HongAnh
// * @created 07 / 11 / 2024 - 1:39 CH
// * @project CreaTShop-server
// * @social Github: https://github.com/lehonganh0201
// * @social Facebook: https://www.facebook.com/profile.php?id=100047152174225
// */
//
//import org.springframework.context.annotation.Configuration;
//import org.springframework.web.servlet.config.annotation.CorsRegistry;
//import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
//
//@Configuration
//public class CORSConfig implements WebMvcConfigurer {
//
//    @Override
//    public void addCorsMappings(CorsRegistry registry) {
//        registry.addMapping("/**")
//                .allowedOriginPatterns("*")
//                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
//                .allowCredentials(true);
//    }
//}