package com.smarturl.controller;

import com.smarturl.model.Url;
import com.smarturl.service.UrlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.NoSuchElementException;

@Controller
public class UrlController {

    private final UrlService urlService;

    @Autowired
    public UrlController(UrlService urlService) {
        this.urlService = urlService;
    }

    /**
     * Serves the main T.LY-style Single Page interface (index.html).
     */
    @GetMapping("/")
    public String indexPage(@RequestParam(value = "error", required = false) String error, Model model) {
        if (error != null) {
            if ("notfound".equalsIgnoreCase(error)) {
                model.addAttribute("errorMessage", "The shortened link does not exist or has been deleted.");
            } else if ("expired".equalsIgnoreCase(error)) {
                model.addAttribute("errorMessage", "The shortened link has expired and is no longer active.");
            }
        }
        return "index";
    }

    /**
     * Directs visitor to the target long URL.
     * Maps GET /{shortCode} as requested by requirements.
     */
    @GetMapping("/{shortCode}")
    public String redirectUrl(@PathVariable("shortCode") String shortCode) {
        // Safeguard: Ignore background static assets requests (favicon, style, scripts)
        if (shortCode == null || shortCode.contains(".") || 
            "favicon.ico".equalsIgnoreCase(shortCode) || 
            "error".equalsIgnoreCase(shortCode)) {
            return "forward:/error"; // Let Spring Boot handle static resources or standard 404 naturally
        }

        try {
            String originalUrl = urlService.resolveAndTrack(shortCode);
            return "redirect:" + originalUrl;
        } catch (NoSuchElementException e) {
            // Redirect to home page with a graceful "not found" query parameter
            return "redirect:/?error=notfound";
        } catch (IllegalStateException e) {
            // Redirect to home page with a graceful "expired" query parameter
            return "redirect:/?error=expired";
        }
    }

    /**
     * Serves the detailed analytical dashboard page for a specific URL.
     */
    @GetMapping("/stats/{shortCode}")
    public String statsPage(@PathVariable("shortCode") String shortCode, Model model) {
        try {
            Url url = urlService.getUrlDetails(shortCode);
            model.addAttribute("url", url);
            return "analytics";
        } catch (NoSuchElementException e) {
            return "redirect:/?error=notfound";
        }
    }
}
