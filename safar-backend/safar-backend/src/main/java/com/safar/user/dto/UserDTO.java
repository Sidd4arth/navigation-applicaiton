package com.safar.user.dto;

import com.safar.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private UUID id;
    private String email;
    private String phone;
    private String name;
    private Instant createdAt;
    private Instant lastActive;
    
    public static UserDTO from(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .phone(user.getPhone())
                .name(user.getName())
                .createdAt(user.getCreatedAt())
                .lastActive(user.getLastActive())
                .build();
    }
}
