package com.smarturl.service;

import com.smarturl.model.Url;
import com.smarturl.repository.UrlRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class UrlService {

    private final UrlRepository urlRepository;
    
    // Reserved path keywords that cannot be used as custom aliases
    private final Set<String> reservedKeywords = new HashSet<>(Arrays.asList(
            "api", "stats", "delete", "shorten", "css", "js", "images", "static", "h2-console", "favicon.ico", "error"
    ));

    private final String CHARACTER_POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private final int CODE_LENGTH = 6;

    @Autowired
    public UrlService(UrlRepository urlRepository) {
        this.urlRepository = urlRepository;
    }

    /**
     * Creates a new shortened URL entry in the database.
     *
     * @param originalUrl The target long URL
     * @param customAlias Optional user-specified custom path
     * @param expiryDate Optional date when the link should expire
     * @return The saved Url object
     */
    @Transactional
    public Url shortenUrl(String originalUrl, String customAlias, LocalDateTime expiryDate) {
        if (originalUrl == null || originalUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("Original URL cannot be empty");
        }

        // Clean up URL format (prepend protocol if missing)
        String cleanedUrl = originalUrl.trim();
        if (!cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
            cleanedUrl = "https://" + cleanedUrl;
        }

        String shortCode;

        if (customAlias != null && !customAlias.trim().isEmpty()) {
            String alias = customAlias.trim();
            
            // Check for reserved words to prevent overriding website assets/routes
            if (reservedKeywords.contains(alias.toLowerCase())) {
                throw new IllegalArgumentException("The custom alias '" + alias + "' is a reserved keyword");
            }
            
            // Validate characters (only letters, numbers, hyphens, and underscores)
            if (!alias.matches("^[a-zA-Z0-9-_]+$")) {
                throw new IllegalArgumentException("Custom alias can only contain letters, numbers, hyphens (-), and underscores (_)");
            }

            // Check if the custom alias is already taken
            if (urlRepository.existsByShortCode(alias)) {
                throw new IllegalArgumentException("Custom alias '" + alias + "' is already in use");
            }
            shortCode = alias;
        } else {
            // Generate a unique random alphanumeric short code
            shortCode = generateUniqueShortCode();
        }

        Url url = new Url(cleanedUrl, shortCode, expiryDate);
        return urlRepository.save(url);
    }

    /**
     * Resolves the short code to its original URL and increments the click count.
     *
     * @param shortCode The short code to resolve
     * @return The original long URL
     */
    @Transactional
    public String resolveAndTrack(String shortCode) {
        Url url = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new NoSuchElementException("URL short code not found: " + shortCode));

        if (url.isExpired()) {
            throw new IllegalStateException("This shortened link has expired");
        }

        // Increment the click count by 1 and save back to the database
        url.setClickCount(url.getClickCount() + 1);
        urlRepository.save(url);

        return url.getOriginalUrl();
    }

    /**
     * Retrieves the URL metadata for details/analytics view.
     */
    public Url getUrlDetails(String shortCode) {
        return urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new NoSuchElementException("URL not found: " + shortCode));
    }

    /**
     * Fetch all URLs matching a list of short codes (used for local storage dashboard sync).
     */
    public List<Url> getUrlsByCodes(List<String> shortCodes) {
        if (shortCodes == null || shortCodes.isEmpty()) {
            return new ArrayList<>();
        }
        return urlRepository.findByShortCodeIn(shortCodes);
    }

    /**
     * Deletes a URL record from the database.
     */
    @Transactional
    public void deleteUrl(Long id) {
        if (!urlRepository.existsById(id)) {
            throw new NoSuchElementException("URL not found for ID: " + id);
        }
        urlRepository.deleteById(id);
    }

    // ===================================================================
    // HELPER METHODS
    // ===================================================================
    private String generateUniqueShortCode() {
        String code;
        int attempts = 0;
        do {
            code = generateRandomString(CODE_LENGTH);
            attempts++;
            if (attempts > 50) {
                // Defensive fallback: increase length if many collisions are encountered
                code = generateRandomString(CODE_LENGTH + 2);
            }
        } while (urlRepository.existsByShortCode(code));
        return code;
    }

    private String generateRandomString(int length) {
        Random random = new Random();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARACTER_POOL.charAt(random.nextInt(CHARACTER_POOL.length())));
        }
        return sb.toString();
    }
}
