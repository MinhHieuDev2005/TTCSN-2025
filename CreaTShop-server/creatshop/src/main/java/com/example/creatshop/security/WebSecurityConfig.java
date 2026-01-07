package com.example.creatshop.security;


import com.example.creatshop.constant.Endpoint;
import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.constant.Status;
import com.example.creatshop.domain.dto.global.GlobalResponse;
import com.example.creatshop.domain.dto.global.Meta;
import com.example.creatshop.security.jwt.AuthTokenFilter;
import com.example.creatshop.security.jwt.JwtAuthEntryPoint;
import com.example.creatshop.util.MessageSourceUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@EnableWebSecurity
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Configuration
@EnableMethodSecurity(jsr250Enabled = true, securedEnabled = true)
public class WebSecurityConfig {

    @NonFinal
    String CATCH_ALL_WILDCARD = "/**";

    JwtAuthEntryPoint      authEntryPoint;
    AuthTokenFilter        authTokenFilter;
    AuthenticationProvider authenticationProvider;
    ObjectMapper       objectMapper;
    MessageSourceUtils messageSourceUtils;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception -> {
                exception.authenticationEntryPoint(authEntryPoint)
                         .accessDeniedHandler(((request, response, accessDeniedException) -> {
                             response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                             response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                             GlobalResponse<Meta, Void> responseBody = GlobalResponse.<Meta, Void>builder()
                                                                                     .meta(Meta.builder()
                                                                                               .status(Status.ERROR)
                                                                                               .message(messageSourceUtils.getLocalizedMessage(ErrorMessage.Auth.ERR_FORBIDDEN))
                                                                                               .build()
                                                                                     )
                                                                                     .build();
                             objectMapper.writeValue(response.getOutputStream(), responseBody);
                         }));
            })
            .authorizeHttpRequests(auth ->
                    auth.requestMatchers(HttpMethod.GET, Endpoint.V1.Category.PREFIX + CATCH_ALL_WILDCARD).permitAll()
                        .requestMatchers(HttpMethod.GET, Endpoint.V1.Product.PREFIX + CATCH_ALL_WILDCARD).permitAll()
                        .requestMatchers(HttpMethod.GET, Endpoint.V1.Variant.PREFIX + CATCH_ALL_WILDCARD).permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(Endpoint.V1.Order.MOVE_TO_NEXT_STATUS + CATCH_ALL_WILDCARD).hasRole("ADMIN")
                        .requestMatchers(Endpoint.V1.Category.PREFIX + CATCH_ALL_WILDCARD).hasRole("ADMIN")
                        .requestMatchers(Endpoint.V1.Product.PREFIX + CATCH_ALL_WILDCARD).hasRole("ADMIN")
                        .requestMatchers(Endpoint.V1.Variant.PREFIX + CATCH_ALL_WILDCARD).hasRole("ADMIN")
                        .requestMatchers(Endpoint.V1.Cart.PREFIX + CATCH_ALL_WILDCARD).authenticated()
                        .requestMatchers(Endpoint.V1.Address.PREFIX + CATCH_ALL_WILDCARD).authenticated()
                        .requestMatchers(Endpoint.V1.Order.PREFIX + CATCH_ALL_WILDCARD).authenticated()
                        .requestMatchers(Endpoint.V1.Payment.PREFIX + CATCH_ALL_WILDCARD).authenticated()
                            .anyRequest().permitAll()
            )
            .authenticationProvider(authenticationProvider);

        http.exceptionHandling().authenticationEntryPoint(authEntryPoint);
        http.addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.addAllowedOrigin("*");
        configuration.addAllowedMethod("GET");
        configuration.addAllowedMethod("POST");
        configuration.addAllowedMethod("PUT");
        configuration.addAllowedMethod("DELETE");
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
