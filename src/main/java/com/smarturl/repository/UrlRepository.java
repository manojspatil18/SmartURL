package com.smarturl.repository;

import com.smarturl.model.Url;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UrlRepository extends JpaRepository<Url, Long> {

    // Retrieve a URL metadata by its shortened code
    Optional<Url> findByShortCode(String shortCode);

    // Check if a short code already exists in the system (used for collisions and custom aliases)
    boolean existsByShortCode(String shortCode);

    // Fetch multiple URLs by a list of short codes. 
    // This allows loading a user's local storage dashboard links in a single efficient query.
    List<Url> findByShortCodeIn(List<String> shortCodes);
}
