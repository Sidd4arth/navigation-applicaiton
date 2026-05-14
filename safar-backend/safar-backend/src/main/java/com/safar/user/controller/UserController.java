package com.safar.user.controller;

import com.safar.common.dto.ApiResponse;
import com.safar.user.dto.UserDTO;
import com.safar.user.entity.User;
import com.safar.user.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDTO>> getProfile(@AuthenticationPrincipal User user) {
        UserDTO profile = userService.getUserProfile(user.getId());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/me/fcm-token")
    public ResponseEntity<ApiResponse<Void>> updateFcmToken(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody FcmTokenRequest request) {
        userService.updateFcmToken(user.getId(), request.getFcmToken());
        return ResponseEntity.ok(ApiResponse.success("FCM token updated", null));
    }
    
    @Data
    public static class FcmTokenRequest {
        @NotBlank(message = "FCM token is required")
        private String fcmToken;
    }
}
