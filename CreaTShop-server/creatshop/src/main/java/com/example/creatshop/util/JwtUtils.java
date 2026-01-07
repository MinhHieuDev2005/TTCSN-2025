package com.example.creatshop.util;

import com.example.creatshop.constant.ErrorMessage;
import com.example.creatshop.domain.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Log4j2
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JwtUtils {

    @Value("${auth.token.jwtSecret}")
    String jwtSecret;

    @Value("${auth.token.expirationInMils}")
    int jwtExpirationTime;

    @Value("${auth.token.refreshInMils}")
    int jwtRefreshTime;

    public String generateJwtToken(Authentication authentication) {
        User loggedUser = (User) authentication.getPrincipal();
        List<String> roles = loggedUser.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return Jwts.builder().setSubject(loggedUser.getUsername())
                .claim("role", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(new Date().getTime() + jwtExpirationTime))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsernameFromToken(String token){
        return Jwts.parserBuilder()
                .setSigningKey(key())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public Date getExpirationTimeFromToken(String token){
        return Jwts.parserBuilder()
                   .setSigningKey(key())
                   .build()
                   .parseClaimsJws(token)
                   .getBody()
                   .getExpiration();
    }

    public boolean validateToken(String token){
        return checkToken(token) == null;
    }

    public String checkToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(key())
                .build()
                .parse(token);

            return null;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return ErrorMessage.Auth.ERR_INVALID_TOKEN;
        } catch (ExpiredJwtException e) {
            log.error("Expired token: {}", e.getMessage());
            return ErrorMessage.Auth.ERR_EXPIRED_SESSION;
        } catch (UnsupportedJwtException e) {
            log.error("This token is not supported: {}", e.getMessage());
            return ErrorMessage.Auth.ERR_UNSUPPORTED_TOKEN;
        } catch (SignatureException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
            return ErrorMessage.Auth.ERR_INVALID_SIGNATURE;
        }
    }

    private Key key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }
}
