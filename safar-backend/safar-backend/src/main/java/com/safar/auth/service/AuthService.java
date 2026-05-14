package com.safar.auth.service;

import com.safar.auth.dto.*;
import com.safar.common.exception.SafarException;
import com.safar.user.dto.UserDTO;
import com.safar.user.entity.User;
import com.safar.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw SafarException.badRequest("EMAIL_EXISTS", "Email already registered");
        }
        
        // Create new user
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .isActive(true)
                .lastActive(Instant.now())
                .build();
        
        user = userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());
        
        // Generate tokens
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtService.getAccessTokenExpiration() / 1000)
                .user(UserDTO.from(user))
                .build();
    }
    
    public LoginResponse login(LoginRequest request) {
        // Authenticate
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        
        // Get user
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> SafarException.notFound("USER_NOT_FOUND", "User not found"));
        
        // Update last active
        user.setLastActive(Instant.now());
        userRepository.save(user);
        
        // Generate tokens
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        
        log.info("User logged in: {}", user.getEmail());
        
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtService.getAccessTokenExpiration() / 1000)
                .user(UserDTO.from(user))
                .build();
    }
    
    public TokenResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        
        // Extract username from refresh token
        String email = jwtService.extractUsername(refreshToken);
        
        // Validate token
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> SafarException.unauthorized("Invalid refresh token"));
        
        if (jwtService.isTokenExpired(refreshToken)) {
            throw SafarException.unauthorized("Refresh token expired");
        }
        
        // Generate new access token
        String newAccessToken = jwtService.generateAccessToken(user);
        
        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .expiresIn(jwtService.getAccessTokenExpiration() / 1000)
                .build();
    }
}
