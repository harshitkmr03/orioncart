package com.orioncart.backend.repository;

import com.orioncart.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByReferralCodeIgnoreCase(String referralCode);
}

