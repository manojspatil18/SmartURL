/* ===================================================================
   SMART URL SHORTENER - DYNAMIC INTERACTIVITY MANAGER (T.LY STYLE)
   =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Theme Management (Dark/Light Mode)
    initTheme();

    // 2. Load and Sync Stored URLs
    syncMyUrls();

    // 3. Setup Collapsible Advanced Options
    setupAdvancedOptions();

    // 4. URL Shortener Form Handling
    setupShortenerForm();

    // 5. Search Bar Client-Side Filtering
    setupTableSearch();
});

// ===================================================================
// 1. THEME MANAGEMENT
// ===================================================================
function initTheme() {
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const themeIcon = themeToggleBtn.querySelector("i");
    
    // Read saved theme or default to dark
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme, themeIcon);

    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        updateThemeIcon(newTheme, themeIcon);
    });
}

function updateThemeIcon(theme, iconElement) {
    if (theme === "light") {
        iconElement.className = "fas fa-moon";
    } else {
        iconElement.className = "fas fa-sun";
    }
}

// ===================================================================
// 2. ADVANCED OPTIONS TOGGLER
// ===================================================================
function setupAdvancedOptions() {
    const toggler = document.getElementById("advancedOptionsToggle");
    const optionsContainer = document.getElementById("advancedOptionsContainer");
    
    if (toggler && optionsContainer) {
        toggler.addEventListener("click", (e) => {
            e.preventDefault();
            toggler.classList.toggle("active");
            
            if (optionsContainer.style.display === "none" || !optionsContainer.style.display) {
                optionsContainer.style.display = "block";
                optionsContainer.classList.add("fade-in");
            } else {
                optionsContainer.style.display = "none";
            }
        });
    }
}

// ===================================================================
// 3. SHORTENER FORM CONTROLLER
// ===================================================================
function setupShortenerForm() {
    const form = document.getElementById("shortenForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const originalUrlInput = document.getElementById("originalUrl");
        const customAliasInput = document.getElementById("customAlias");
        const expiryDateInput = document.getElementById("expiryDate");
        const btnSubmit = form.querySelector("button[type='submit']");

        const originalUrl = originalUrlInput.value.trim();
        const customAlias = customAliasInput.value.trim();
        const expiryDate = expiryDateInput.value;

        if (!originalUrl) {
            showToast("Please enter a long URL", "danger");
            return;
        }

        // Show spinner / loading state
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Shortening...`;

        try {
            const response = await fetch("/shorten", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    originalUrl: originalUrl,
                    customAlias: customAlias,
                    expiryDate: expiryDate
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Save short code to browser localStorage
                saveCodeToLocalStorage(data.shortCode);
                
                // Clear fields
                originalUrlInput.value = "";
                customAliasInput.value = "";
                expiryDateInput.value = "";
                
                // Collapse advanced options if open
                const optionsContainer = document.getElementById("advancedOptionsContainer");
                const toggler = document.getElementById("advancedOptionsToggle");
                if (optionsContainer && optionsContainer.style.display === "block") {
                    optionsContainer.style.display = "none";
                    toggler.classList.remove("active");
                }

                // Show success feedback & refresh dashboard
                showToast("Link shortened successfully!", "success");
                await syncMyUrls();
                
                // Scroll down to dashboard
                document.getElementById("dashboardSection").scrollIntoView({ behavior: "smooth" });
            } else {
                showToast(data.error || "Failed to shorten URL", "danger");
            }
        } catch (error) {
            showToast("Network error. Please try again.", "danger");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
    });
}

// ===================================================================
// 4. LOCALSTORAGE MANAGEMENT & DATABASE SYNC
// ===================================================================
function getSavedCodes() {
    const codes = localStorage.getItem("smart_url_codes");
    return codes ? JSON.parse(codes) : [];
}

function saveCodeToLocalStorage(code) {
    let codes = getSavedCodes();
    if (!codes.includes(code)) {
        codes.unshift(code); // Put newest links at the top
        localStorage.setItem("smart_url_codes", JSON.stringify(codes));
    }
}

function removeCodeFromLocalStorage(code) {
    let codes = getSavedCodes();
    codes = codes.filter(c => c !== code);
    localStorage.setItem("smart_url_codes", JSON.stringify(codes));
}

async function syncMyUrls() {
    const tableBody = document.getElementById("urlTableBody");
    const emptyState = document.getElementById("emptyStateContainer");
    const tableContainer = document.getElementById("tableContainerMain");
    
    if (!tableBody) return;

    const localCodes = getSavedCodes();

    if (localCodes.length === 0) {
        tableContainer.style.display = "none";
        emptyState.style.display = "block";
        return;
    }

    try {
        const response = await fetch("/api/my-urls", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(localCodes)
        });

        if (response.ok) {
            const urls = await response.json();
            
            // Clean up any short codes in localStorage that are no longer in the DB
            const dbShortCodes = urls.map(u => u.shortCode);
            const filteredLocalCodes = localCodes.filter(c => dbShortCodes.includes(c));
            if (filteredLocalCodes.length !== localCodes.length) {
                localStorage.setItem("smart_url_codes", JSON.stringify(filteredLocalCodes));
            }

            if (urls.length === 0) {
                tableContainer.style.display = "none";
                emptyState.style.display = "block";
                return;
            }

            // Show table, hide empty placeholder
            emptyState.style.display = "none";
            tableContainer.style.display = "block";

            // Render table rows
            tableBody.innerHTML = "";
            urls.forEach(url => {
                const row = createTableRow(url);
                tableBody.appendChild(row);
            });

            // Initialize bootstrap tooltips
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    } catch (error) {
        console.error("Error syncing dashboard URLs:", error);
    }
}

function createTableRow(url) {
    const tr = document.createElement("tr");
    
    const host = window.location.origin;
    const shortUrl = `${host}/${url.shortCode}`;
    const cleanOriginalUrl = escapeHtml(url.originalUrl);
    
    // Evaluate expiry and status
    const isExpired = url.expiryDate ? new Date(url.expiryDate) < new Date() : false;
    const statusBadge = isExpired 
        ? `<span class="badge-premium badge-expired"><i class="fas fa-exclamation-circle me-1"></i>Expired</span>`
        : `<span class="badge-premium badge-active"><i class="fas fa-check-circle me-1"></i>Active</span>`;

    // Date formatting (readable locale)
    const createdDate = new Date(url.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    tr.innerHTML = `
        <td>
            <a href="${shortUrl}" target="_blank" class="short-url-link">${shortUrl}</a>
        </td>
        <td>
            <span class="original-url-cell" title="${cleanOriginalUrl}">${cleanOriginalUrl}</span>
        </td>
        <td class="text-center font-monospace fw-bold text-light">${url.clickCount}</td>
        <td>${createdDate}</td>
        <td>${statusBadge}</td>
        <td class="text-nowrap">
            <button class="action-btn" data-bs-toggle="tooltip" data-bs-placement="top" title="Copy Link" onclick="copyLink(this, '${shortUrl}')">
                <i class="far fa-copy"></i>
            </button>
            <button class="action-btn" data-bs-toggle="tooltip" data-bs-placement="top" title="Show QR Code" onclick="openQrModal('${shortUrl}', '${url.shortCode}')">
                <i class="fas fa-qrcode"></i>
            </button>
            <a href="/stats/${url.shortCode}" class="action-btn text-decoration-none" data-bs-toggle="tooltip" data-bs-placement="top" title="View Analytics">
                <i class="fas fa-chart-line"></i>
            </a>
            <button class="action-btn btn-delete" data-bs-toggle="tooltip" data-bs-placement="top" title="Delete Link" onclick="confirmDeleteUrl(${url.id}, '${url.shortCode}')">
                <i class="far fa-trash-alt"></i>
            </button>
        </td>
    `;
    return tr;
}

// ===================================================================
// 5. ACTION FUNCTIONS (COPY, QR, DELETE)
// ===================================================================
function copyLink(buttonElement, textToCopy) {
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Change icon temporarily to checkmark
        const icon = buttonElement.querySelector("i");
        const originalClass = icon.className;
        icon.className = "fas fa-check text-success";
        
        showToast("Copied to clipboard!", "success");

        setTimeout(() => {
            icon.className = originalClass;
        }, 1500);
    }).catch(err => {
        showToast("Failed to copy link", "danger");
    });
}

function openQrModal(shortUrl, shortCode) {
    document.getElementById("qrModalTitle").innerText = `QR Code - ${shortCode}`;
    const qrDiv = document.getElementById("qrcode");
    qrDiv.innerHTML = ""; // Reset old QR image
    
    // Draw QR code via CDN script (QRCode)
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrDiv, {
            text: shortUrl,
            width: 200,
            height: 200,
            colorDark: "#0d0b21",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Set up PNG download action
        const downloadBtn = document.getElementById("btnDownloadQr");
        downloadBtn.onclick = function() {
            const canvas = qrDiv.querySelector("canvas");
            if (canvas) {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = imgData;
                link.download = `qr_${shortCode}.png`;
                link.click();
            } else {
                // If the library used image instead of canvas
                const img = qrDiv.querySelector("img");
                if (img) {
                    const link = document.createElement("a");
                    link.href = img.src;
                    link.download = `qr_${shortCode}.png`;
                    link.click();
                }
            }
        };

        const qrModal = new bootstrap.Modal(document.getElementById("qrModal"));
        qrModal.show();
    } else {
        showToast("QR engine is loading, please try in a second", "warning");
    }
}

async function confirmDeleteUrl(id, shortCode) {
    if (confirm(`Are you sure you want to delete the shortened link /${shortCode}?`)) {
        try {
            const response = await fetch(`/delete/${id}`, {
                method: "DELETE"
            });
            const data = await response.json();
            
            if (response.ok) {
                removeCodeFromLocalStorage(shortCode);
                showToast("Shortened URL deleted.", "success");
                syncMyUrls();
            } else {
                showToast(data.error || "Failed to delete link.", "danger");
            }
        } catch (error) {
            showToast("Network error while deleting link.", "danger");
        }
    }
}

// ===================================================================
// 6. CLIENT-SIDE SEARCH BAR FILTER
// ===================================================================
function setupTableSearch() {
    const searchBar = document.getElementById("searchBar");
    if (!searchBar) return;

    searchBar.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll("#urlTableBody tr");

        rows.forEach(row => {
            const originalUrl = row.querySelector(".original-url-cell").innerText.toLowerCase();
            const shortUrl = row.querySelector(".short-url-link").innerText.toLowerCase();
            
            if (originalUrl.includes(query) || shortUrl.includes(query)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    });
}

// ===================================================================
// GENERAL UTILITY FUNCTIONS
// ===================================================================
function showToast(message, type = "success") {
    // Dynamic glassmorphic toast notification creator
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white bg-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'} border-0 show glass-card py-2 px-3 m-2`;
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.style.backdropFilter = "blur(15px)";
    toast.style.backgroundColor = type === 'danger' ? 'rgba(255, 23, 68, 0.85)' : type === 'success' ? 'rgba(0, 230, 118, 0.85)' : 'rgba(138, 92, 255, 0.85)';
    toast.style.border = "1px solid rgba(255, 255, 255, 0.15)";
    toast.style.minWidth = "250px";

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body fw-semibold text-white">
                <i class="fas ${type === 'danger' ? 'fa-exclamation-triangle' : 'fa-info-circle'} me-2"></i> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Auto dismiss toast in 4 seconds
    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("fade");
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
