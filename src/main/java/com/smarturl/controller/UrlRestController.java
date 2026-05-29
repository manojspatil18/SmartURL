package com.smarturl.controller;

import com.smarturl.model.Url;
import com.smarturl.service.UrlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
public class UrlRestController {

    private final UrlService urlService;

    @Autowired
    public UrlRestController(UrlService urlService) {
        this.urlService = urlService;
    }

    /**
     * POST /shorten
     * Accepts URL shortening request and returns JSON metadata.
     */
    @PostMapping("/shorten")
    public ResponseEntity<?> createShortUrl(@RequestBody ShortenRequest request) {
        try {
            LocalDateTime expiry = null;
            if (request.getExpiryDate() != null && !request.getExpiryDate().trim().isEmpty()) {
                try {
                    // Try parsing standard datetime-local picker value (yyyy-MM-dd'T'HH:mm)
                    String dateString = request.getExpiryDate();
                    if (!dateString.contains("T")) {
                        // Standard format fallback
                        expiry = LocalDateTime.parse(dateString, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    } else {
                        expiry = LocalDateTime.parse(dateString);
                    }
                    
                    if (expiry.isBefore(LocalDateTime.now())) {
                        Map<String, String> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Expiry date cannot be in the past.");
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
                    }
                } catch (DateTimeParseException e) {
                    Map<String, String> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Invalid expiry date format. Please use YYYY-MM-DDTHH:MM");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
                }
            }

            Url url = urlService.shortenUrl(request.getOriginalUrl(), request.getCustomAlias(), expiry);
            return ResponseEntity.status(HttpStatus.CREATED).body(url);

        } catch (IllegalArgumentException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "An unexpected error occurred while shortening the URL.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * GET /analytics/{shortCode}
     * Returns JSON analytics details for a given short code.
     */
    @GetMapping("/analytics/{shortCode}")
    public ResponseEntity<?> getUrlAnalytics(@PathVariable("shortCode") String shortCode) {
        try {
            Url url = urlService.getUrlDetails(shortCode);
            return ResponseEntity.ok(url);
        } catch (NoSuchElementException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "URL short code not found.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
    }

    /**
     * DELETE /delete/{id}
     * Deletes a shortened URL by its primary key ID.
     */
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteShortUrl(@PathVariable("id") Long id) {
        try {
            urlService.deleteUrl(id);
            Map<String, String> successResponse = new HashMap<>();
            successResponse.put("message", "URL successfully deleted.");
            return ResponseEntity.ok(successResponse);
        } catch (NoSuchElementException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "URL record not found.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
    }

    /**
     * POST /api/my-urls
     * Accepts a list of short codes stored in user's browser localStorage.
     * Returns the live database status, creation date, clicks, and validity for each.
     */
    @PostMapping("/api/my-urls")
    public ResponseEntity<?> getMyUrlsLiveDetails(@RequestBody List<String> shortCodes) {
        try {
            List<Url> urls = urlService.getUrlsByCodes(shortCodes);
            return ResponseEntity.ok(urls);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to retrieve local URLs status.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // ===================================================================
    // DTO CLASS DEFINITION
    // ===================================================================
    public static class ShortenRequest {
        private String originalUrl;
        private String customAlias;
        private String expiryDate;

        public ShortenRequest() {
        }

        public String getOriginalUrl() {
            return originalUrl;
        }

        public void setOriginalUrl(String originalUrl) {
            this.originalUrl = originalUrl;
        }

        public String getCustomAlias() {
            return customAlias;
        }

        public void setCustomAlias(String customAlias) {
            this.customAlias = customAlias;
        }

        public String getExpiryDate() {
            return expiryDate;
        }

        public void setExpiryDate(String expiryDate) {
            this.expiryDate = expiryDate;
        }
    }
}
