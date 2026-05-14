package com.safar.sos.repository;

import com.safar.sos.entity.TrustedContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TrustedContactRepository extends JpaRepository<TrustedContact, UUID> {

    List<TrustedContact> findByUserIdOrderByIsPrimaryDescCreatedAtAsc(UUID userId);

    int countByUserId(UUID userId);

    void deleteByIdAndUserId(UUID id, UUID userId);
}
