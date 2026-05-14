package com.safar.sos.controller;

import com.safar.common.dto.ApiResponse;
import com.safar.common.exception.SafarException;
import com.safar.sos.dto.TrustedContactDTO;
import com.safar.sos.dto.TrustedContactRequest;
import com.safar.sos.entity.TrustedContact;
import com.safar.sos.repository.TrustedContactRepository;
import com.safar.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/contacts")
@RequiredArgsConstructor
public class TrustedContactController {

    private final TrustedContactRepository contactRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<TrustedContactDTO>> addContact(
            @Valid @RequestBody TrustedContactRequest request,
            @AuthenticationPrincipal User user) {

        if (contactRepository.countByUserId(user.getId()) >= 5) {
            throw SafarException.badRequest("MAX_CONTACTS", "Maximum 5 emergency contacts allowed");
        }

        TrustedContact contact = TrustedContact.builder()
                .user(user)
                .name(request.getName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .relationship(request.getRelationship())
                .isPrimary(request.getIsPrimary())
                .build();

        contact = contactRepository.save(contact);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Emergency contact added", TrustedContactDTO.from(contact)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, List<TrustedContactDTO>>>> getContacts(
            @AuthenticationPrincipal User user) {

        List<TrustedContactDTO> contacts = contactRepository
                .findByUserIdOrderByIsPrimaryDescCreatedAtAsc(user.getId())
                .stream()
                .map(TrustedContactDTO::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(Map.of("contacts", contacts)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteContact(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        TrustedContact contact = contactRepository.findById(id)
                .orElseThrow(() -> SafarException.notFound("CONTACT_NOT_FOUND", "Contact not found"));

        if (!contact.getUser().getId().equals(user.getId())) {
            throw SafarException.forbidden("Cannot delete another user's contact");
        }

        contactRepository.delete(contact);

        return ResponseEntity.ok(ApiResponse.success("Contact removed", null));
    }
}
