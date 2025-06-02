// DOM Elements
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const signOutBtn = document.getElementById("signOutBtn");
const booksContainer = document.getElementById("booksContainer");
const categoryItems = document.querySelectorAll(".category-list li");
const myBooksItems = document.querySelectorAll(".my-books-list li");
const gridViewBtn = document.getElementById("gridViewBtn");
const listViewBtn = document.getElementById("listViewBtn");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const readingList = document.getElementById("readingList");
const userProfileBtn = document.getElementById("userProfileBtn");
const profileDropdown = document.querySelector(".profile-dropdown");
const profileLink = document.querySelector(".profile-link");
const settingsLink = document.querySelector(".settings-link");

// State variables
let currentUser = null;
let userBooks = [];
let currentCategory = "all";
let currentFilter = "all";
let allBooks = [];
let currentBookId = null;

// Google Books API Configuration
const BookAPI = {
  config: {
    googleBooksAPI: "https://www.googleapis.com/books/v1/volumes",
    apiKey: "AIzaSyDY5akRjy0bk_wqWDSU1vcfL8ngeTLsz1w",
    placeholderImage:
      "https://via.placeholder.com/180x260?text=No+Cover+Available",
    maxResults: 20,
  },

  async searchBooks(query, limit = 20) {
    const url = `${this.config.googleBooksAPI}?q=${encodeURIComponent(
      query
    )}&maxResults=${limit}&key=${this.config.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Search failed");
    const data = await response.json();
    return this.formatBooks(data.items || []);
  },

  async getBooksByCategory(category, limit = 20) {
    let query = "";
    switch (category) {
      case "fiction":
        query = "subject:fiction";
        break;
      case "non-fiction":
        query = "subject:nonfiction";
        break;
      case "science":
        query = "subject:science";
        break;
      case "history":
        query = "subject:history";
        break;
      default:
        query = "language:eng";
    }
    return this.searchBooks(query, limit);
  },

  formatBooks(books) {
    return books.map((book) => ({
      id: book.id,
      title: book.volumeInfo.title,
      authors: book.volumeInfo.authors || ["Unknown Author"],
      publishYear:
        book.volumeInfo.publishedDate?.split("-")[0] || "Unknown Year",
      isbn: this.extractBookIdentifier(book.volumeInfo),
      cover: this.getBookCoverImage(book.volumeInfo),
      description: book.volumeInfo.description || "No description available",
      subjects: book.volumeInfo.categories || [],
      pageCount: book.volumeInfo.pageCount || "Unknown",
    }));
  },

  extractBookIdentifier(bookInfo) {
    const identifiers = bookInfo.industryIdentifiers;
    if (identifiers && identifiers.length > 0) {
      return (
        identifiers.find((id) => id.type === "ISBN_13")?.identifier ||
        identifiers.find((id) => id.type === "ISBN_10")?.identifier ||
        identifiers[0].identifier
      );
    }
    return bookInfo.id || "unknown";
  },

  getBookCoverImage(bookInfo) {
    return (
      bookInfo.imageLinks?.thumbnail ||
      bookInfo.imageLinks?.smallThumbnail ||
      this.config.placeholderImage
    );
  },
};

// Authentication state observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    updateUserProfile(user);
    await loadUserBooks();
    await loadFeaturedBooks();
  } else {
    window.location.href = "login.html";
  }
});

// Update user profile display
function updateUserProfile(user) {
  userName.textContent = user.displayName || user.email.split("@")[0];
  if (user.photoURL) {
    userAvatar.src = user.photoURL;
  } else {
    const name = user.displayName || user.email.split("@")[0];
    userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=8b5cf6&color=fff&size=32`;
  }
}

// Toggle profile dropdown
userProfileBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("Profile button clicked"); // Debug log
  profileDropdown.classList.toggle("hidden");
  console.log(
    "Dropdown hidden class:",
    profileDropdown.classList.contains("hidden")
  ); // Debug log
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (
    !userProfileBtn.contains(e.target) &&
    !profileDropdown.contains(e.target)
  ) {
    profileDropdown.classList.add("hidden");
  }
});

// Prevent dropdown from closing when clicking inside it
profileDropdown.addEventListener("click", (e) => {
  e.stopPropagation();
});

// Sign out click handler
signOutBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await auth.signOut();
    window.location.href = "login.html";
  } catch (error) {
    console.error("Sign out error:", error);
  }
});

// Load user's saved books and reading list
async function loadUserBooks() {
  try {
    const userRef = db.collection("users").doc(currentUser.uid);
    const savedBooksRef = userRef.collection("savedBooks");
    const readingListRef = userRef.collection("readingList");
    const completedBooksRef = userRef.collection("completedBooks"); // Add this

    // Get all collections
    const [savedBooksSnapshot, readingListSnapshot, completedBooksSnapshot] =
      await Promise.all([
        savedBooksRef.get(),
        readingListRef.get(),
        completedBooksRef.get(), // Add this
      ]);

    const savedBooks = [];
    const readingList = [];
    const completedBooks = []; // Add this

    savedBooksSnapshot.forEach((doc) => {
      savedBooks.push({ id: doc.id, ...doc.data() });
    });

    readingListSnapshot.forEach((doc) => {
      readingList.push({ id: doc.id, ...doc.data() });
    });

    completedBooksSnapshot.forEach((doc) => {
      // Add this
      completedBooks.push({ id: doc.id, ...doc.data() });
    });

    userBooks = [...savedBooks, ...readingList, ...completedBooks]; // Include completed books
    updateBookCounts();
    updateReadingList();
    updateSavedBooksList();
    updateCompletedBooksList();

    console.log("=== Current User Books ===");
    console.log("Saved Books:", savedBooks);
    console.log("Reading List:", readingList);
    console.log("Completed Books:", completedBooks); // Add this
  } catch (error) {
    console.error("Error loading user books:", error);
    showToast("Failed to load your books", "error");
  }
}

// Load featured books
async function loadFeaturedBooks() {
  try {
    showLoading(true);
    const books = await BookAPI.getBooksByCategory("all", 12);
    allBooks = books;
    displayBooks(books);
    showLoading(false);
  } catch (error) {
    console.error("Error loading featured books:", error);
    showToast("Failed to load books", "error");
    showLoading(false);
  }
}

// Display books in container
function displayBooks(books) {
  booksContainer.innerHTML = "";

  if (books.length === 0) {
    showEmptyState(true);
    return;
  }

  showEmptyState(false);

  books.forEach((book) => {
    const bookCard = createBookCard(book);
    booksContainer.appendChild(bookCard);
  });
}

// Create book card element
function createBookCard(book) {
  const isBookmarked = userBooks.some((userBook) => userBook.id === book.id);
  const userBook = userBooks.find((userBook) => userBook.id === book.id);
  const status = userBook?.status || "none";
  const progress = userBook?.readingProgress || 0;

  const card = document.createElement("div");
  card.className = "book-card";
  card.innerHTML = `
                <div class="book-cover-container">
                    <img src="${book.cover}" 
                         alt="${book.title}" 
                         class="book-cover" 
                         onerror="this.src='${
                           BookAPI.config.placeholderImage
                         }'">
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.authors.join(", ")}</p>
                    <p class="book-year">${book.publishYear}</p>
                    <div class="book-meta">
                        <span class="page-count">
                            <i class="fas fa-file-alt"></i>
                            ${book.pageCount} pages
                        </span>
                        ${
                          status !== "none"
                            ? `<span class="status-badge ${status}">${status}</span>`
                            : ""
                        }
                    </div>
                    <p class="book-description">${book.description.substring(
                      0,
                      100
                    )}${book.description.length > 100 ? "..." : ""}</p>
                    ${
                      status === "saved"
                        ? `
                        <div class="reading-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text">${progress}%</span>
                        </div>
                    `
                        : ""
                    }
                    <div class="book-actions">
                        <button class="action-btn read-btn" onclick="readBook('${
                          book.id
                        }')">
                            <i class="fas fa-book-open"></i>
                            Read
                        </button>
                        ${
                          status === "saved"
                            ? `
                            <button class="action-btn update-progress-btn" onclick="showProgressModal('${book.id}', ${progress})">
                                <i class="fas fa-edit"></i>
                                Update Progress
                            </button>
                        `
                            : `
                            <button class="action-btn save-btn ${
                              isBookmarked ? "saved" : ""
                            }" 
                                    onclick="toggleBookmark('${
                                      book.id
                                    }', this)">
                                <i class="fas fa-bookmark"></i>
                                ${isBookmarked ? "Saved" : "Save"}
                            </button>
                        `
                        }
                        ${
                          status === "completed"
                            ? `
    <div class="book-rating">
        <div class="rating-stars">
            ${Array.from(
              { length: 5 },
              (_, i) =>
                `<i class="fas fa-star ${i < rating ? "active" : ""}"></i>`
            ).join("")}
        </div>
    </div>
`
                            : ""
                        }

                    </div>
                </div>
            `;
  return card;
}

// Toggle save functionality
async function toggleBookmark(bookId, button) {
  if (!currentUser) {
    showToast("Please log in to save books", "error");
    return;
  }

  try {
    const book = allBooks.find((b) => b.id === bookId);
    if (!book) return;

    const savedBookRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("savedBooks")
      .doc(bookId);
    const isSaved = userBooks.some(
      (userBook) => userBook.id === bookId && userBook.status === "saved"
    );

    if (isSaved) {
      await savedBookRef.delete();
      button.classList.remove("saved");
      button.innerHTML = '<i class="fas fa-bookmark"></i> Save';
      showToast("Book removed from saved books", "success");
    } else {
      await savedBookRef.set({
        ...book,
        status: "saved",
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      button.classList.add("saved");
      button.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
      showToast("Book saved successfully", "success");
    }

    await loadUserBooks();
  } catch (error) {
    console.error("Error toggling save:", error);
    showToast("Failed to update saved books", "error");
  }
}

// Read book functionality
async function readBook(bookId) {
  const book =
    allBooks.find((b) => b.id === bookId) ||
    userBooks.find((b) => b.id === bookId);
  if (book && book.isbn) {
    try {
      // Add to reading list if not already there
      const readingListRef = db
        .collection("users")
        .doc(currentUser.uid)
        .collection("readingList")
        .doc(bookId);
      await readingListRef.set({
        ...book,
        status: "reading",
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Open Google Books link
      window.open(`https://books.google.com/books?id=${book.id}`, "_blank");
      await loadUserBooks();
    } catch (error) {
      console.error("Error adding to reading list:", error);
      showToast("Failed to add to reading list", "error");
    }
  } else {
    showToast("Book not available for reading", "info");
  }
}

// Update book counts
function updateBookCounts() {
  const savedCount = userBooks.filter((book) => book.status === "saved").length;
  const readingCount = userBooks.filter(
    (book) => book.status === "reading"
  ).length;
  const completedCount = userBooks.filter(
    (book) => book.status === "completed"
  ).length; // Add this

  document.getElementById("saved-count").textContent = savedCount;
  document.getElementById("reading-count").textContent = readingCount;
  document.getElementById("completed-count").textContent = completedCount; // Add this
}

// Update reading list display
function updateReadingList() {
  const currentlyReading = userBooks
    .filter((book) => book.status === "reading")
    .slice(0, 5);
  readingList.innerHTML = "";

  if (currentlyReading.length === 0) {
    readingList.innerHTML =
      '<li class="empty-reading">No books currently reading</li>';
    return;
  }

  currentlyReading.forEach((book) => {
    const listItem = document.createElement("li");
    listItem.className = "reading-item";
    listItem.innerHTML = `
                    <div class="reading-book-info">
                        <img src="${book.cover}" alt="${book.title}" class="reading-book-cover">
                        <h4 class="reading-book-title">${book.title}</h4>
                    </div>
                    <button class="continue-reading-btn" onclick="readBook('${book.id}')">
                        <i class="fas fa-play"></i>
                    </button>
                `;
    readingList.appendChild(listItem);
  });
}

// Update saved books list display
function updateSavedBooksList() {
  const savedBooks = userBooks.filter((book) => book.status === "saved");
  const savedBooksList = document.getElementById("savedBooksList");
  savedBooksList.innerHTML = "";

  if (savedBooks.length === 0) {
    savedBooksList.innerHTML = '<li class="empty-saved">No saved books</li>';
    return;
  }

  savedBooks.forEach((book) => {
    const progress = book.readingProgress || 0;
    const listItem = document.createElement("li");
    listItem.className = "saved-book-item";
    listItem.innerHTML = `
                    <div class="saved-book-info">
                        <img src="${book.cover}" alt="${book.title}" class="saved-book-cover">
                        <div class="saved-book-details">
                            <h4 class="saved-book-title">${book.title}</h4>
                            <div class="reading-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                                <span class="progress-text">${progress}%</span>
                            </div>
                        </div>
                    </div>
                `;
    savedBooksList.appendChild(listItem);
  });
}

// Update Completed Books list
function updateCompletedBooksList() {
  const completedBooks = userBooks.filter(
    (book) => book.status === "completed"
  );
  const completedBooksList = document.getElementById("completedBooksList");
  completedBooksList.innerHTML = "";

  if (completedBooks.length === 0) {
    completedBooksList.innerHTML =
      '<li class="empty-completed">No completed books</li>';
    return;
  }

  completedBooks.forEach((book) => {
    const rating = book.rating || 0;
    const listItem = document.createElement("li");
    listItem.className = "completed-book-item";
    listItem.innerHTML = `
            <div class="completed-book-info">
                <img src="${book.cover}" alt="${
      book.title
    }" class="completed-book-cover">
                <div class="completed-book-details">
                    <h4 class="completed-book-title">${book.title}</h4>
                    <div class="book-rating">
                        <div class="rating-stars">
                            ${Array.from(
                              { length: 5 },
                              (_, i) =>
                                `<i class="fas fa-star ${
                                  i < rating ? "active" : ""
                                }"></i>`
                            ).join("")}
                        </div>
                      
                    </div>
                    ${
                      book.completedAt
                        ? `<div class="completion-date">
                            
                            Completed: ${new Date(
                              book.completedAt.toDate()
                            ).toLocaleDateString()}
                        </div>`
                        : ""
                    }
                </div>
            </div>
        `;
    completedBooksList.appendChild(listItem);
  });
}

// Show progress modal
function showProgressModal(bookId, currentProgress) {
  // Ensure currentBookId is set first
  if (!bookId) {
    console.error("No book ID provided to showProgressModal");
    showToast("Error: No book selected", "error");
    return;
  }

  currentBookId = bookId;
  console.log("Setting currentBookId to:", currentBookId); // Debug log

  const modal = document.getElementById("progressModal");
  const slider = document.getElementById("progressSlider");
  const valueDisplay = document.getElementById("progressValue");

  slider.value = currentProgress;
  valueDisplay.textContent = currentProgress;

  modal.classList.remove("hidden");

  // Update value display when slider moves
  slider.addEventListener("input", (e) => {
    valueDisplay.textContent = e.target.value;
  });
}

// Close progress modal
function closeProgressModal() {
  const modal = document.getElementById("progressModal");
  modal.classList.add("hidden");
}

// Update reading progress
async function updateReadingProgress() {
  console.log(
    "updateReadingProgress called with currentBookId:",
    currentBookId
  ); // Debug log

  if (!currentBookId) {
    console.error("No book ID found in updateReadingProgress");
    showToast("Error: No book selected", "error");
    return;
  }

  const progress = parseInt(document.getElementById("progressSlider").value);

  try {
    const bookRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("savedBooks")
      .doc(currentBookId);

    if (progress === 100) {
      // Show completion modal instead of just updating progress
      closeProgressModal();
      showCompletionModal(currentBookId);
      return;
    }

    await bookRef.update({
      readingProgress: progress,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Update local state
    const bookIndex = userBooks.findIndex((book) => book.id === currentBookId);
    if (bookIndex !== -1) {
      userBooks[bookIndex].readingProgress = progress;
    }

    showToast("Reading progress updated successfully", "success");
    closeProgressModal();
    updateSavedBooksList();

    // Refresh the display if needed
    if (currentFilter === "saved") {
      const filteredBooks = userBooks.filter((book) => book.status === "saved");
      displayBooks(filteredBooks);
    }
  } catch (error) {
    console.error("Error updating progress:", error);
    showToast("Failed to update reading progress", "error");
  }
}

// Show completion modal
function showCompletionModal(bookId) {
  if (!bookId) {
    console.error("No book ID provided to showCompletionModal");
    showToast("Error: No book selected", "error");
    return;
  }

  currentBookId = bookId;
  console.log("Setting currentBookId for completion to:", currentBookId); // Debug log

  const modal = document.getElementById("completionModal");
  modal.classList.remove("hidden");

  // Reset form
  document.getElementById("bookReview").value = "";
  document.getElementById("bookTags").value = "";
  document.querySelectorAll(".rating-stars i").forEach((star) => {
    star.classList.remove("active");
  });

  // Add click handlers for stars
  document.querySelectorAll(".rating-stars i").forEach((star) => {
    star.addEventListener("click", function () {
      const rating = this.dataset.rating;
      document.querySelectorAll(".rating-stars i").forEach((s) => {
        s.classList.toggle("active", s.dataset.rating <= rating);
      });
    });
  });
}

// Close completion modal
function closeCompletionModal() {
  const modal = document.getElementById("completionModal");
  modal.classList.add("hidden");
  currentBookId = null;
}

// Save book completion
async function saveBookCompletion() {
  console.log("saveBookCompletion called for book:", currentBookId); // Debug log

  if (!currentBookId) {
    console.error("No book ID found"); // Debug log
    showToast("Error: No book selected. Please try again.", "error");
    closeCompletionModal(); // Close the modal if there's an error
    return;
  }

  if (!currentUser) {
    console.error("No user logged in");
    showToast("Error: Please log in to complete books", "error");
    return;
  }

  const rating = document.querySelectorAll(".rating-stars i.active").length;
  const review = document.getElementById("bookReview").value.trim();
  const tags = document
    .getElementById("bookTags")
    .value.trim()
    .split(",")
    .map((tag) => tag.trim());

  console.log("Completion data:", { rating, review, tags }); // Debug log

  try {
    // Get the book data from saved books
    const savedBookRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("savedBooks")
      .doc(currentBookId);
    const savedBookDoc = await savedBookRef.get();

    if (!savedBookDoc.exists) {
      console.error("Book not found in saved books"); // Debug log
      showToast("Book not found in saved books", "error");
      return;
    }

    const bookData = savedBookDoc.data();
    console.log("Retrieved book data:", bookData); // Debug log

    // Create completed book data
    const completedBookData = {
      ...bookData,
      status: "completed",
      readingProgress: 100,
      rating: rating,
      review: review,
      tags: tags,
      completedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    console.log("Saving completed book data:", completedBookData); // Debug log

    // Add to completed books collection
    const completedBookRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("completedBooks")
      .doc(currentBookId);
    await completedBookRef.set(completedBookData);

    // Remove from saved books
    await savedBookRef.delete();

    // Update local state
    userBooks = userBooks.filter((book) => book.id !== currentBookId);
    userBooks.push(completedBookData);

    // Update UI
    updateSavedBooksList();
    updateBookCounts();

    // Close modal and show success message
    closeCompletionModal();
    showToast("Book marked as completed!", "success");

    // Refresh the books display if we're viewing saved books
    if (currentFilter === "saved") {
      const filteredBooks = userBooks.filter((book) => book.status === "saved");
      if (filteredBooks.length === 0) {
        showEmptyState(true);
      } else {
        displayBooks(filteredBooks);
        showEmptyState(false);
      }
    }
  } catch (error) {
    console.error("Error completing book:", error);
    showToast("Failed to complete book", "error");
  }
}

// Search functionality
searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    showToast("Please enter a search term", "info");
    return;
  }

  try {
    showLoading(true);
    const searchResults = await BookAPI.searchBooks(query);
    if (searchResults.length === 0) {
      showEmptyState(true);
      showToast("No books found matching your search", "info");
    } else {
      allBooks = searchResults;
      displayBooks(searchResults);
      showEmptyState(false);
    }
    showLoading(false);
  } catch (error) {
    console.error("Search error:", error);
    showToast("Search failed. Please try again.", "error");
    showLoading(false);
    showEmptyState(true);
  }
}

// Category filtering
categoryItems.forEach((item) => {
  item.addEventListener("click", async () => {
    categoryItems.forEach((cat) => cat.classList.remove("active"));
    item.classList.add("active");
    currentCategory = item.dataset.category;

    try {
      showLoading(true);
      const books = await BookAPI.getBooksByCategory(currentCategory);
      if (books.length === 0) {
        showEmptyState(true);
        showToast("No books found in this category", "info");
      } else {
        allBooks = books;
        displayBooks(books);
        showEmptyState(false);
      }
      showLoading(false);
    } catch (error) {
      console.error("Error loading category books:", error);
      showToast("Failed to load books", "error");
      showLoading(false);
      showEmptyState(true);
    }
  });
});

// My books filtering
myBooksItems.forEach((item) => {
  item.addEventListener("click", () => {
    myBooksItems.forEach((cat) => cat.classList.remove("active"));
    item.classList.add("active");
    currentFilter = item.dataset.status;

    const filteredBooks = userBooks.filter((book) => {
      if (currentFilter === "saved")
        return book.status === "saved" || !book.status;
      return book.status === currentFilter;
    });

    if (filteredBooks.length === 0) {
      showEmptyState(true);
      showToast(`No ${currentFilter} books found`, "info");
    } else {
      displayBooks(filteredBooks);
      showEmptyState(false);
    }
  });
});

// View toggle functionality
gridViewBtn.addEventListener("click", () => {
  booksContainer.className = "books-grid";
  gridViewBtn.classList.add("active");
  listViewBtn.classList.remove("active");
});

listViewBtn.addEventListener("click", () => {
  booksContainer.className = "books-list";
  gridViewBtn.classList.remove("active");
  listViewBtn.classList.add("active");
});

// Show/hide loading state
function showLoading(show) {
  if (show) {
    loadingState.classList.remove("hidden");
    emptyState.classList.add("hidden");
  } else {
    loadingState.classList.add("hidden");
  }
}

// Show/hide empty state
function showEmptyState(show) {
  if (show) {
    emptyState.classList.remove("hidden");
    loadingState.classList.add("hidden");
  } else {
    emptyState.classList.add("hidden");
  }
}

// Toast notification system
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
                <div class="toast-content">
                    <i class="fas fa-${getToastIcon(type)}"></i>
                    <span>${message}</span>
                </div>
                <button class="toast-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;

  const container = document.getElementById("toastContainer");
  container.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);

  // Animate in
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);
}

function getToastIcon(type) {
  const icons = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };
  return icons[type] || "info-circle";
}

// Export functions for global access
window.toggleBookmark = toggleBookmark;
window.readBook = readBook;
