package com.example.creatshop.social;

import com.example.creatshop.constant.AccountStatus;
import com.example.creatshop.constant.RoleType;
import com.example.creatshop.domain.dto.response.AuthResponse;
import com.example.creatshop.domain.entity.Cart;
import com.example.creatshop.domain.entity.Role;
import com.example.creatshop.domain.entity.User;
import com.example.creatshop.repository.CartRepository;
import com.example.creatshop.repository.RoleRepository;
import com.example.creatshop.repository.UserRepository;
import com.example.creatshop.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SocialAuthService {
    private final SocialIdentityRepository identities;
    private final UserRepository users;
    private final CartRepository carts;
    private final RoleRepository roles;
    private final PasswordEncoder passwords;
    private final JwtUtils jwt;

    @Transactional
    public String resolve(String provider, OAuth2User principal) {
        String subject = principal.getName();
        if (!java.util.Set.of("google", "facebook").contains(provider) || subject == null || subject.isBlank() || subject.length() > 255) {
            throw failure("login_failed");
        }
        var identity = identities.findByProviderAndSubject(provider, subject);
        if (identity.isPresent()) {
            if (!subject.equals(identity.get().getSubject()) || !provider.equals(identity.get().getProvider())) throw failure("login_failed");
            return active(identity.get().getUser()).getId();
        }

        String email = attribute(principal, "email").trim().toLowerCase(Locale.ROOT);
        if (email.length() > 255 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw failure("email_required");
        if (provider.equals("google") && !Boolean.TRUE.equals(principal.getAttribute("email_verified"))) throw failure("email_unverified");
        if (users.existsByEmailIgnoreCase(email)) throw failure("email_exists");
        Role role = roles.findByType(RoleType.ROLE_USER).orElseGet(() -> roles.save(Role.builder()
                .type(RoleType.ROLE_USER).description("Customer").build()));
        Cart cart = carts.save(new Cart());
        String firstName = attribute(principal, provider.equals("google") ? "given_name" : "first_name");
        User user = users.saveAndFlush(User.builder()
                .username(provider + "_" + UUID.randomUUID().toString().replace("-", ""))
                .password(passwords.encode(UUID.randomUUID().toString() + UUID.randomUUID()))
                .email(email).firstName(firstName.isBlank() ? provider : firstName)
                .lastName(attribute(principal, provider.equals("google") ? "family_name" : "last_name"))
                .phoneNumber("").status(AccountStatus.ACTIVE).role(role).cart(cart).build());
        SocialIdentity created = new SocialIdentity();
        created.setProvider(provider);
        created.setSubject(subject);
        created.setUser(user);
        identities.saveAndFlush(created);
        return user.getId();
    }

    @Transactional(readOnly = true)
    public AuthResponse tokenFor(String userId) {
        User user = active(users.findById(userId).orElseThrow(() -> failure("login_failed")));
        var authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        return new AuthResponse(jwt.generateJwtToken(authentication), "Bearer", user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).collect(Collectors.joining(",")));
    }

    private User active(User user) {
        if (user.getStatus() != AccountStatus.ACTIVE) throw failure("account_locked");
        return user;
    }

    private String attribute(OAuth2User principal, String name) {
        Object value = principal.getAttribute(name);
        if (value instanceof String text && text.length() > 255) throw failure("login_failed");
        return value instanceof String text ? text : "";
    }

    public static OAuth2AuthenticationException failure(String code) {
        return new OAuth2AuthenticationException(new OAuth2Error(code));
    }
}
