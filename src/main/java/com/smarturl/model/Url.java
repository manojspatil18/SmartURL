package com.smarturl.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "urls")
public class Url {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Original URL cannot be blank")
    @Size(max = 2048, message = "Original URL is too long (maximum 2048 characters)")
    @Column(name = "original_url", length = 2048, nullable = false)
    private String originalUrl;

    @NotBlank(message = "Short code cannot be blank")
    @Size(max = 50, message = "Short code cannot exceed 50 characters")
    @Column(name = "short_code", length = 50, unique = true, nullable = false)
    private String shortCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "click_count", nullable = false)
    private int clickCount = 0;

    // Standard Hook: Pre-populate creation date automatically before persisting in the database
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // ===================================================================
    // CONSTRUCTORS
    // ===================================================================
    public Url() {
    }

    public Url(String originalUrl, String shortCode, LocalDateTime expiryDate) {
        this.originalUrl = originalUrl;
        this.shortCode = shortCode;
        this.expiryDate = expiryDate;
        this.clickCount = 0;
    }

    public Url(Long id, String originalUrl, String shortCode, LocalDateTime createdAt, LocalDateTime expiryDate, int clickCount) {
        this.id = id;
        this.originalUrl = originalUrl;
        this.shortCode = shortCode;
        this.createdAt = createdAt;
        this.expiryDate = expiryDate;
        this.clickCount = clickCount;
    }

    // ===================================================================
    // GETTERS AND SETTERS
    // ===================================================================
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOriginalUrl() {
        return originalUrl;
    }

    public void setOriginalUrl(String originalUrl) {
        this.originalUrl = originalUrl;
    }

    public String getShortCode() {
        return shortCode;
    }

    public void setShortCode(String shortCode) {
        this.shortCode = shortCode;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDateTime expiryDate) {
        this.expiryDate = expiryDate;
    }

    public int getClickCount() {
        return clickCount;
    }

    public void setClickCount(int clickCount) {
        this.clickCount = clickCount;
    }

    // ===================================================================
    // UTILITY METHODS
    // ===================================================================
    // Simple helper to check if a URL has already expired
    public boolean isExpired() {
        if (expiryDate == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(expiryDate);
    }
}
