package com.example.creatshop.config;


import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.constant.RoleType;
import com.example.creatshop.domain.entity.Cart;
import com.example.creatshop.domain.entity.Role;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.repository.CartRepository;
import com.example.creatshop.repository.RoleRepository;
import com.example.creatshop.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class WebConfig {
    UserRepository userRepository;

    @Bean
    public PasswordEncoder encoder(){
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public UserDetailsService userDetailsService(){
        return username -> userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService());
        provider.setPasswordEncoder(encoder());
        return provider;
    }

    @Bean
    public SecureRandom secureRandom() {
        return new SecureRandom();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }

//    @Bean
//    public boolean initSystem(RoleRepository roleRepository, CartRepository cartRepository, PasswordEncoder encoder) {
//        Role roleAdmin = null;
//
//        if (!roleRepository.existsByType(RoleType.ROLE_ADMIN)) {
//            roleAdmin = Role.builder()
//                       .type(RoleType.ROLE_ADMIN)
//                       .description("This role for admin")
//                       .build();
//
//            roleAdmin = roleRepository.save(roleAdmin);
//
//            Role roleUser = Role.builder()
//                    .type(RoleType.ROLE_USER)
//                    .description("This role for user")
//                    .build();
//
//            roleUser = roleRepository.save(roleUser);
//        }
//
//        if (!userRepository.existsByUsername("lehonganh")) {
//            User user = User.builder()
//                            .firstName("Le Hong")
//                            .lastName("Anh")
//                            .username("lehonganh")
//                            .password(encoder.encode("Password123!"))
//                            .phoneNumber("039125678")
//                            .email("le292620@gmail.com")
//                    .status(AccountStatus.ACTIVE)
//                            .role(roleAdmin)
//                            .build();
//
//            User user1 = User.builder()
//                    .firstName("Le Phuong")
//                    .lastName("Anh")
//                    .username("lephuonganh")
//                    .password(encoder.encode("Password123!"))
//                    .phoneNumber("039125678")
//                    .email("lephuonganhktpm1k17@gmail.com")
//                    .status(AccountStatus.ACTIVE)
//                    .role(roleAdmin)
//                    .build();
//
//            User user2 = User.builder()
//                    .firstName("Vu Thi")
//                    .lastName("Hong Nhung")
//                    .username("vuthihongnhung")
//                    .password(encoder.encode("Password123!"))
//                    .phoneNumber("039125678")
//                    .email("vthn3003@gmail.com")
//                    .status(AccountStatus.ACTIVE)
//                    .role(roleAdmin)
//                    .build();
//
//            User user3 = User.builder()
//                    .firstName("Nguyen Thi")
//                    .lastName("Anh Phuong")
//                    .username("nguyenthianhphuong")
//                    .password(encoder.encode("Password123!"))
//                    .phoneNumber("039125678")
//                    .email("nguyenthianhphuong2000tp@gmail.com")
//                    .status(AccountStatus.ACTIVE)
//                    .role(roleAdmin)
//                    .build();
//
//            Cart cart = Cart.builder().build();
//            Cart cart1 = Cart.builder().build();
//            Cart cart2 = Cart.builder().build();
//            Cart cart3 = Cart.builder().build();
//
//            cart = cartRepository.save(cart);
//            cart1 = cartRepository.save(cart1);
//            cart2 = cartRepository.save(cart2);
//            cart3 = cartRepository.save(cart3);
//
//            user.setCart(cart);
//            user1.setCart(cart1);
//            user2.setCart(cart2);
//            user3.setCart(cart3);
//
//            userRepository.save(user);
//            userRepository.save(user1);
//            userRepository.save(user2);
//            userRepository.save(user3);
//        }
//
//        return true;
//    }
}