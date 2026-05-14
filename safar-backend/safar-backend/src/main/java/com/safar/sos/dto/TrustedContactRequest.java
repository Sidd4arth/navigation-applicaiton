package com.safar.sos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TrustedContactRequest {

    @NotBlank(message = "Contact name is required")
    @Size(max = 255)
    private String name;

    @NotBlank(message = "Phone number is required")
    @Size(min = 10, max = 15, message = "Phone must be 10-15 digits")
    private String phone;

    private String email;

    @Size(max = 100)
    private String relationship;

    private Boolean isPrimary = false;
}
