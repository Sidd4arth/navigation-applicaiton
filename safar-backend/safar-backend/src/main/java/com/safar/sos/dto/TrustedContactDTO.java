package com.safar.sos.dto;

import com.safar.sos.entity.TrustedContact;
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
public class TrustedContactDTO {
    private UUID id;
    private String name;
    private String phone;
    private String email;
    private String relationship;
    private boolean isPrimary;
    private Instant createdAt;

    public static TrustedContactDTO from(TrustedContact contact) {
        return TrustedContactDTO.builder()
                .id(contact.getId())
                .name(contact.getName())
                .phone(contact.getPhone())
                .email(contact.getEmail())
                .relationship(contact.getRelationship())
                .isPrimary(contact.getIsPrimary())
                .createdAt(contact.getCreatedAt())
                .build();
    }
}
