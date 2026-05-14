package com.safar.user.service;

import com.safar.common.exception.SafarException;
import com.safar.user.dto.UserDTO;
import com.safar.user.entity.User;
import com.safar.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {
    
    private final UserRepository userRepository;
    
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
    
    public User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> SafarException.notFound("USER_NOT_FOUND", "User not found"));
    }
    
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> SafarException.notFound("USER_NOT_FOUND", "User not found"));
    }
    
    @Transactional
    public void updateFcmToken(UUID userId, String fcmToken) {
        User user = findById(userId);
        user.setFcmToken(fcmToken);
        userRepository.save(user);
    }
    
    @Transactional
    public void updateLastActive(UUID userId) {
        User user = findById(userId);
        user.setLastActive(Instant.now());
        userRepository.save(user);
    }
    
    public UserDTO getUserProfile(UUID userId) {
        User user = findById(userId);
        return UserDTO.from(user);
    }
}
