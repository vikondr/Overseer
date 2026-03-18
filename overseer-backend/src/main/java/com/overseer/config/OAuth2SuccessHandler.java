package com.overseer.config;

import com.overseer.model.User;
import com.overseer.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Value("${overseer.frontend-url:}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = oauthToken.getPrincipal();
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();

        User user = processOAuthUser(registrationId, oAuth2User);
        String jwt = jwtUtil.generateToken(user.getId(), user.getEmail());

        if (frontendUrl == null || frontendUrl.isBlank()) {
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"token\":\"" + jwt + "\"}");
            return;
        }

        String redirectUrl = frontendUrl + "/auth/callback?token=" + jwt;
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private User processOAuthUser(String registrationId, OAuth2User oAuth2User) {
        Map<String, Object> attrs = oAuth2User.getAttributes();
        User.AuthProvider provider = registrationId.equalsIgnoreCase("google")
            ? User.AuthProvider.GOOGLE
            : User.AuthProvider.GITHUB;

        String providerId = String.valueOf(attrs.get("id") != null ? attrs.get("id") : attrs.get("sub"));
        String email = (String) attrs.get("email");
        String name = (String) attrs.get("name");
        String avatarUrl = registrationId.equalsIgnoreCase("google")
            ? (String) attrs.get("picture")
            : (String) attrs.get("avatar_url");

        return userRepository.findByProviderAndProviderId(provider, providerId)
            .map(existing -> {
                if (avatarUrl != null) existing.setAvatarUrl(avatarUrl);
                if (name != null) existing.setDisplayName(name);
                return userRepository.save(existing);
            })
            .orElseGet(() -> {
                String username = generateUniqueUsername(email, name);
                User newUser = User.builder()
                    .username(username)
                    .email(email)
                    .displayName(name != null ? name : username)
                    .avatarUrl(avatarUrl)
                    .provider(provider)
                    .providerId(providerId)
                    .build();
                return userRepository.save(newUser);
            });
    }

    private String generateUniqueUsername(String email, String name) {
        String base = (name != null)
            ? name.toLowerCase().replaceAll("[^a-z0-9]", "")
            : email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9]", "");

        if (base.isEmpty()) base = "user";
        if (base.length() > 20) base = base.substring(0, 20);

        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }
}
