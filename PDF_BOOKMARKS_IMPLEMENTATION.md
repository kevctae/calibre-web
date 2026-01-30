# PDF Bookmarks Feature Implementation

## Overview
This document describes the implementation of custom PDF bookmarks feature for Calibre-Web Automated. Users can now create named bookmarks for specific pages in PDF files, which are stored in the database and allow quick navigation.

## Features Implemented

### 1. Database Model (`cps/ub.py`)
- **New Model**: `PdfBookmark`
  - `id`: Primary key
  - `user_id`: Foreign key to user table
  - `book_id`: Book ID reference
  - `name`: Custom bookmark name (user-defined)
  - `page`: Page number
  - `created`: Timestamp of bookmark creation

The bookmarks are stored in the `app.db` database (user-specific data), not in `metadata.db`.

### 2. API Endpoints (`cps/web.py`)
Three new AJAX endpoints were added:

#### Get Bookmarks
- **Route**: `GET /ajax/pdf-bookmark/<book_id>`
- **Description**: Retrieves all bookmarks for a specific PDF book for the current user
- **Returns**: JSON array of bookmarks sorted by page number

#### Create Bookmark
- **Route**: `POST /ajax/pdf-bookmark/<book_id>`
- **Body**: `{"name": "bookmark_name", "page": page_number}`
- **Description**: Creates a new bookmark for the current page
- **Returns**: Created bookmark object with status 201
- **Validation**: 
  - Bookmark name is required and cannot be empty
  - Page number must be a valid integer >= 1
  - Duplicate bookmark names are prevented (returns 409)

#### Delete Bookmark
- **Route**: `DELETE /ajax/pdf-bookmark/<bookmark_id>`
- **Description**: Deletes a bookmark (only if it belongs to the current user)
- **Returns**: 204 No Content on success

### 3. Frontend UI (`cps/templates/readpdf.html`)
Added bookmark management UI to the PDF viewer sidebar:

- **New Sidebar Button**: "Bookmarks" button added to the sidebar view buttons
- **Bookmarks Panel**: New collapsible panel in the sidebar showing:
  - "Add Bookmark" button at the top
  - List of all bookmarks with:
    - Bookmark name
    - Page number
    - Delete button (×)
- **Integration**: Uses the existing PDF.js viewer framework

### 4. JavaScript Module (`cps/static/js/pdf-bookmarks.js`)
Complete client-side bookmark management:

**Core Functions**:
- `loadBookmarks()`: Fetches bookmarks from the server on page load
- `addBookmark()`: Creates a new bookmark with user-provided name
- `deleteBookmark()`: Removes a bookmark with confirmation
- `navigateToPage()`: Jumps to the bookmarked page when clicked
- `renderBookmarks()`: Displays the bookmark list in the UI

**Features**:
- Automatic loading when PDF viewer initializes
- Toast notifications for user feedback (success/error messages)
- Sorted by page number for easy navigation
- XSS protection with HTML escaping
- CSRF token protection for all mutations

### 5. Styling (`cps/static/css/pdf-bookmarks.css`)
Professional styling for the bookmark interface:

- Clean, modern design matching the PDF viewer aesthetic
- Hover effects for better UX
- Responsive layout
- Dark mode support (media query based)
- Toast notifications with smooth animations

## User Workflow

### Adding a Bookmark
1. Open a PDF in the reader
2. Navigate to the desired page
3. Click the "Bookmarks" button in the sidebar
4. Click "+ Add Bookmark" button
5. Enter a custom name in the prompt dialog
6. The bookmark is saved and appears in the list

### Using a Bookmark
1. Click the "Bookmarks" button in the sidebar
2. Click on any bookmark in the list
3. The PDF viewer automatically jumps to that page

### Deleting a Bookmark
1. Click the "Bookmarks" button in the sidebar
2. Click the "×" button next to the bookmark you want to delete
3. Confirm the deletion in the dialog
4. The bookmark is removed from the list

## Database Migration

The `pdf_bookmark` table will be automatically created when the application starts if it doesn't exist. The SQLAlchemy ORM handles table creation based on the model definition.

If you need to manually create the table, use this SQL:

```sql
CREATE TABLE pdf_bookmark (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    page INTEGER NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE INDEX idx_pdf_bookmark_user_book ON pdf_bookmark(user_id, book_id);
```

## Technical Notes

### Security
- All bookmark operations require user authentication (`@user_login_required`)
- CSRF tokens protect mutation endpoints
- User isolation: Users can only view/modify their own bookmarks
- Input validation prevents invalid page numbers and empty bookmark names
- XSS protection via HTML escaping in the frontend

### Performance
- Bookmarks are loaded once on page load
- Minimal DOM manipulation for smooth UX
- Indexed database queries for fast retrieval
- Sorted by page number for logical ordering

### Browser Compatibility
- Uses standard ES5 JavaScript for maximum compatibility
- No external dependencies beyond PDF.js
- Works with all modern browsers that support PDF.js

## Files Modified/Created

### Modified:
1. `cps/ub.py` - Added `PdfBookmark` model
2. `cps/web.py` - Added 3 API endpoints
3. `cps/templates/readpdf.html` - Added UI components and script references

### Created:
1. `cps/static/js/pdf-bookmarks.js` - Client-side bookmark logic
2. `cps/static/css/pdf-bookmarks.css` - Bookmark styling

## Testing Recommendations

1. **Basic Operations**:
   - Create a bookmark on page 1
   - Create multiple bookmarks on different pages
   - Navigate to bookmarks by clicking them
   - Delete bookmarks

2. **Edge Cases**:
   - Try to create a bookmark with an empty name (should fail)
   - Try to create duplicate bookmark names (should fail)
   - Test with PDFs of different sizes (1 page, 100+ pages)
   - Test with multiple users (bookmarks should be user-specific)

3. **UI/UX**:
   - Verify the bookmarks button appears in the sidebar
   - Check that bookmarks are sorted by page number
   - Confirm toast notifications appear for actions
   - Test dark mode styling

## Future Enhancements

Possible improvements for future versions:
1. Edit bookmark names (without deleting and recreating)
2. Bookmark notes/descriptions
3. Bookmark folders/categories
4. Export/import bookmarks
5. Shared bookmarks between users
6. Bookmark synchronization with external devices
7. Search/filter bookmarks by name
8. Keyboard shortcuts for bookmark operations

## Support

If you encounter any issues:
1. Check browser console for JavaScript errors
2. Verify the database table was created
3. Ensure you're logged in as a valid user
4. Check server logs for API endpoint errors
5. Verify CSRF token is being sent with requests
