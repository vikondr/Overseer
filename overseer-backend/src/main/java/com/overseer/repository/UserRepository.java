package com.overseer.repository;

import com.overseer.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndProviderId(User.AuthProvider provider, String providerId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.skills WHERE u.id = :id")
    Optional<User> findByIdWithSkills(String id);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<User> searchUsers(@Param("q") String query, Pageable pageable);
}
