/**
 * PDF Bookmarks Module
 * Handles custom bookmark functionality for PDF viewer
 */
(function() {
    'use strict';

    const BOOK_ID = window.bookId;
    const CSRF_TOKEN = window.csrfToken;
    
    let bookmarks = [];
    let pdfApp = null;

    // Initialize when PDF viewer is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for PDF.js to load
        const checkPdfApp = setInterval(function() {
            if (window.PDFViewerApplication) {
                pdfApp = window.PDFViewerApplication;
                clearInterval(checkPdfApp);
                initBookmarks();
            }
        }, 100);
    });

    function initBookmarks() {
        setupEventListeners();
        loadBookmarks();
    }

    function setupEventListeners() {
        // View bookmarks button
        const viewBookmarksBtn = document.getElementById('viewBookmarks');
        if (viewBookmarksBtn) {
            viewBookmarksBtn.addEventListener('click', function(e) {
                e.preventDefault();
                switchToBookmarksView();
            });
        }

        // Add bookmark button
        const addBookmarkBtn = document.getElementById('addBookmarkBtn');
        if (addBookmarkBtn) {
            addBookmarkBtn.addEventListener('click', function() {
                showAddBookmarkDialog();
            });
        }

        // Listen to other sidebar buttons to hide bookmarks view when they're clicked
        const sidebarButtons = ['viewThumbnail', 'viewOutline', 'viewAttachments', 'viewLayers'];
        sidebarButtons.forEach(function(buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', function() {
                    hideBookmarksView();
                });
            }
        });
    }

    function switchToBookmarksView() {
        // Hide all other views
        const views = ['thumbnailView', 'outlineView', 'attachmentsView', 'layersView'];
        views.forEach(function(viewId) {
            const view = document.getElementById(viewId);
            if (view) {
                view.classList.add('hidden');
            }
        });

        // Show bookmarks view
        const bookmarksView = document.getElementById('bookmarksView');
        if (bookmarksView) {
            bookmarksView.classList.remove('hidden');
        }

        // Update button states
        const buttons = document.querySelectorAll('#sidebarViewButtons button');
        buttons.forEach(function(btn) {
            if (btn.id === 'viewBookmarks') {
                btn.classList.add('toggled');
                btn.setAttribute('aria-checked', 'true');
            } else {
                btn.classList.remove('toggled');
                btn.setAttribute('aria-checked', 'false');
            }
        });
    }

    function hideBookmarksView() {
        const bookmarksView = document.getElementById('bookmarksView');
        if (bookmarksView) {
            bookmarksView.classList.add('hidden');
        }

        // Update bookmarks button state
        const viewBookmarksBtn = document.getElementById('viewBookmarks');
        if (viewBookmarksBtn) {
            viewBookmarksBtn.classList.remove('toggled');
            viewBookmarksBtn.setAttribute('aria-checked', 'false');
        }
    }

    function loadBookmarks() {
        fetch('/ajax/pdf-bookmark/' + BOOK_ID, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to load bookmarks');
            }
            return response.json();
        })
        .then(function(data) {
            bookmarks = data;
            renderBookmarks();
        })
        .catch(function(error) {
            console.error('Error loading bookmarks:', error);
            showMessage('Failed to load bookmarks', 'error');
        });
    }

    function renderBookmarks() {
        const bookmarksList = document.getElementById('bookmarksList');
        if (!bookmarksList) return;

        if (bookmarks.length === 0) {
            bookmarksList.innerHTML = '<div class="no-bookmarks">No bookmarks yet. Add one by clicking the button above!</div>';
            return;
        }

        bookmarksList.innerHTML = '';
        bookmarks.forEach(function(bookmark) {
            const bookmarkItem = document.createElement('div');
            bookmarkItem.className = 'bookmark-item';
            bookmarkItem.innerHTML = 
                '<div class="bookmark-info" data-page="' + bookmark.page + '">' +
                    '<div class="bookmark-name">' + escapeHtml(bookmark.name) + '</div>' +
                    '<div class="bookmark-page">Page ' + bookmark.page + '</div>' +
                '</div>' +
                '<button class="bookmark-delete" data-id="' + bookmark.id + '" title="Delete bookmark">×</button>';
            
            // Click on bookmark to navigate
            const bookmarkInfo = bookmarkItem.querySelector('.bookmark-info');
            bookmarkInfo.addEventListener('click', function() {
                navigateToPage(bookmark.page);
            });

            // Delete bookmark
            const deleteBtn = bookmarkItem.querySelector('.bookmark-delete');
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteBookmark(bookmark.id);
            });

            bookmarksList.appendChild(bookmarkItem);
        });
    }

    function showAddBookmarkDialog() {
        if (!pdfApp || !pdfApp.pdfViewer) {
            showMessage('PDF viewer not ready', 'error');
            return;
        }

        const currentPage = pdfApp.pdfViewer.currentPageNumber;
        const name = prompt('Enter bookmark name:', 'Page ' + currentPage);
        
        if (name && name.trim()) {
            addBookmark(name.trim(), currentPage);
        }
    }

    function addBookmark(name, page) {
        fetch('/ajax/pdf-bookmark/' + BOOK_ID, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN
            },
            body: JSON.stringify({
                name: name,
                page: page
            })
        })
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(data) {
                    throw new Error(data.error || 'Failed to create bookmark');
                });
            }
            return response.json();
        })
        .then(function(bookmark) {
            bookmarks.push(bookmark);
            bookmarks.sort(function(a, b) { return a.page - b.page; });
            renderBookmarks();
            showMessage('Bookmark added successfully', 'success');
        })
        .catch(function(error) {
            console.error('Error adding bookmark:', error);
            showMessage(error.message, 'error');
        });
    }

    function deleteBookmark(bookmarkId) {
        if (!confirm('Are you sure you want to delete this bookmark?')) {
            return;
        }

        fetch('/ajax/pdf-bookmark/' + bookmarkId, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': CSRF_TOKEN
            }
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to delete bookmark');
            }
            bookmarks = bookmarks.filter(function(bm) { return bm.id !== bookmarkId; });
            renderBookmarks();
            showMessage('Bookmark deleted successfully', 'success');
        })
        .catch(function(error) {
            console.error('Error deleting bookmark:', error);
            showMessage('Failed to delete bookmark', 'error');
        });
    }

    function navigateToPage(pageNumber) {
        if (pdfApp && pdfApp.pdfViewer) {
            pdfApp.pdfViewer.currentPageNumber = pageNumber;
        }
    }

    function showMessage(message, type) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'pdf-bookmark-toast ' + type;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
            toast.classList.add('show');
        }, 10);

        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
