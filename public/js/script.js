const NYT_API_KEY = "DA7vclGjMD1NNd1Z5xe0rsDLUBFjEsZR";

async function showTrendingNYTBooks() {
    const grid = document.getElementById('trending-books-grid');
    grid.innerHTML = `
        <div class="carousel-header">
            <h2 class="carousel-title">New York Times Bestsellers</h2>
            <div class="carousel-controls">
                <button id="nyt-prev-btn" class="carousel-nav-btn" aria-label="Previous books">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button id="nyt-next-btn" class="carousel-nav-btn" aria-label="Next books">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
        <div class="book-carousel">
            <div class="carousel-track" id="nyt-carousel-track"></div>
        </div>
        <div class="carousel-indicators" id="nyt-carousel-indicators"></div>
    `;

    try {
        const res = await fetch(
            `https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=${NYT_API_KEY}`
        );
        const data = await res.json();
        const books = data.results.books || [];

        // Carousel config
        const booksPerPage = 4;
        let currentPage = 0;
        const totalPages = Math.ceil(books.length / booksPerPage);

        function renderPage() {
            const track = document.getElementById('nyt-carousel-track');
            track.innerHTML = '';
            const start = currentPage * booksPerPage;
            const pageBooks = books.slice(start, start + booksPerPage);
            pageBooks.forEach(book => {
                const card = document.createElement('div');
                card.className = 'book-card';
                card.innerHTML = `
                    <img src="${book.book_image}" alt="${book.title}" class="book-cover" />
                    <div class="book-info">
                        <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">${book.author}</p>
                        <p class="book-year">Rank #${book.rank} | ${book.weeks_on_list} weeks</p>
                        <p class="book-description">${book.description}</p>
                        <div class="book-actions">
                            <a href="${book.amazon_product_url}" class="action-btn action-btn-primary" target="_blank">
                                <i class="fas fa-shopping-cart"></i> View on Amazon
                            </a>
                        </div>
                    </div>
                `;
                track.appendChild(card);
            });

            // Update indicators
            const indicators = document.getElementById('nyt-carousel-indicators');
            indicators.innerHTML = '';
            for (let i = 0; i < totalPages; i++) {
                const dot = document.createElement('div');
                dot.className = "carousel-indicator" + (i === currentPage ? " active" : "");
                dot.addEventListener("click", () => {
                    currentPage = i;
                    renderPage();
                    updateButtons();
                });
                indicators.appendChild(dot);
            }
            updateButtons();
        }

        function updateButtons() {
            document.getElementById('nyt-prev-btn').disabled = currentPage === 0;
            document.getElementById('nyt-next-btn').disabled = currentPage === totalPages - 1;
        }

        document.getElementById('nyt-prev-btn').onclick = function () {
            if (currentPage > 0) {
                currentPage--;
                renderPage();
            }
        };
        document.getElementById('nyt-next-btn').onclick = function () {
            if (currentPage < totalPages - 1) {
                currentPage++;
                renderPage();
            }
        };

        renderPage();

    } catch (err) {
        grid.innerHTML = '<div class="empty-message">Failed to load trending books. Please try again later.</div>';
    }
}

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const userProfileBtn = document.getElementById('userProfileBtn');
  const profileDropdown = document.querySelector('.profile-dropdown');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const signOutBtn = document.getElementById('signOutBtn');
  const dashboardLink = document.getElementById('dashboardLink');

  // Check authentication state
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      userName.textContent = user.displayName || user.email.split('@')[0];
      if (user.photoURL) {
        userAvatar.src = user.photoURL;
      } else {
        const name = user.displayName || user.email.split('@')[0];
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=32`;
      }
      if (dashboardLink) dashboardLink.style.display = 'block'; // Show dashboard link
    } else {
      // User is signed out
      userName.textContent = 'Reader';
      userAvatar.src = 'https://ui-avatars.com/api/?name=Reader&background=8b5cf6&color=fff&size=32';
      if (dashboardLink) dashboardLink.style.display = 'none'; // Hide dashboard link
    }
  });

  // Configuration and state management
  const BookSearchEngine = {
    config: {
      googleBooksAPI: "https://www.googleapis.com/books/v1/volumes",
      apiKey: "AIzaSyDY5akRjy0bk_wqWDSU1vcfL8ngeTLsz1w",
      placeholderImage: "https://placehold.co/180x260?text=No+Cover",
      maxResults: 20,
      animationDuration: 1000,
      booksPerPage: 4,
    },

    elements: {
      searchButton: document.getElementById("discover-books-btn"),
      searchInput: document.getElementById("book-query-input"),
      resultsContainer: document.getElementById("book-results-grid"),
      headerSection: document.getElementById("main-header"),
      bookCollection: document.querySelector(".book-discovery-section"),
      titleSection: document.getElementById("title"),
      prevButton: document.getElementById("prev-btn"),
      nextButton: document.getElementById("next-btn"),
      carouselIndicators: document.getElementById("carousel-indicators"),
      genreFilters: document.querySelectorAll('.filter-chip'),
      sortSelector: document.getElementById('sort-books'),
    },

    state: {
      currentQuery: "",
      isSearching: false,
      searchCache: new Map(),
      currentPage: 0,
      totalPages: 0,
      books: [],
      currentCategory: 'all',
      currentSort: 'relevance',
    },

    // Initialize the search engine
    init() {
      this.bindEventHandlers();
      this.setupEnterKeySearch();
      this.hideBookCollection();
      this.setupCarouselControls();
      this.setupGenreFilters();
      this.setupSorting();
    },

    // Event binding for user interactions
    bindEventHandlers() {
      this.elements.searchButton.addEventListener("click", () => {
        this.executeBookSearch();
      });
    },

    // Enable search on Enter key press
    setupEnterKeySearch() {
      this.elements.searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.executeBookSearch();
        }
      });
    },

    // Main search execution function
    async executeBookSearch() {
      const queryText = this.elements.searchInput.value.trim();

      if (!this.validateSearchInput(queryText)) {
        this.showInputError();
        return;
      }

      if (this.state.isSearching) return;

      this.clearResults();
      this.state.isSearching = true;
      this.state.currentQuery = queryText;

      try {
        this.displayLoadingState();

        const bookResults = await this.fetchBooksFromAPI(queryText);

        if (bookResults.totalItems === 0) {
          this.showNoResultsMessage();
          return;
        }

        this.animateHeaderTransition();
        this.renderBookCollection(bookResults);
        this.showBookCollection();
      } catch (error) {
        this.handleSearchError(error);
      } finally {
        this.state.isSearching = false;
        this.clearSearchInput();
      }
    },

    // Input validation
    validateSearchInput(query) {
      return query && query.length > 0 && query.length <= 100;
    },

    // API call to Google Books
    async fetchBooksFromAPI(searchTerm) {
      // Check cache first
      if (this.state.searchCache.has(searchTerm)) {
        return this.state.searchCache.get(searchTerm);
      }

      const searchURL = `${this.config.googleBooksAPI}?q=${encodeURIComponent(
        searchTerm
      )}&maxResults=${this.config.maxResults}&key=${this.config.apiKey}`;

      const response = await fetch(searchURL);

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }

      const data = await response.json();

      // Cache the results
      this.state.searchCache.set(searchTerm, data);
      return data;
    },

    // Render search results
    renderBookCollection(apiResponse) {
      const books = apiResponse.items || [];
      this.state.books = books;
      this.state.totalPages = Math.ceil(books.length / this.config.booksPerPage);
      this.state.currentPage = 0;

      // Clear existing results first
      this.elements.resultsContainer.innerHTML = "";

      // Create the carousel structure only if it doesn't exist
      if (!document.querySelector(".book-results-container")) {
        this.elements.resultsContainer.className = "book-results-container";
        this.elements.resultsContainer.innerHTML = `
          <div class="carousel-header">
            <h2 class="carousel-title">Search Results</h2>
            <div class="carousel-controls">
              <button id="prev-btn" class="carousel-nav-btn" aria-label="Previous books">
                <i class="fas fa-chevron-left"></i>
              </button>
              <button id="next-btn" class="carousel-nav-btn" aria-label="Next books">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <div class="book-carousel">
            <div class="carousel-track"></div>
          </div>
          <div class="carousel-indicators"></div>
        `;

        // Update element references
        this.elements.prevButton = document.getElementById("prev-btn");
        this.elements.nextButton = document.getElementById("next-btn");
        this.elements.carouselIndicators = document.querySelector(".carousel-indicators");
        this.elements.resultsContainer = document.querySelector(".carousel-track");
      }

      // Apply sorting and display books
      this.sortAndDisplayBooks();

      // Setup carousel controls
      this.setupCarouselControls();
    },

    updateNavigationButtons() {
      this.elements.prevButton.disabled = this.state.currentPage === 0;
      this.elements.nextButton.disabled = this.state.currentPage === this.state.totalPages - 1;
    },

    setupCarouselControls() {
      this.elements.prevButton.addEventListener("click", () => {
        if (this.state.currentPage > 0) {
          this.state.currentPage--;
          this.updateCarouselPosition();
          this.updateCarouselIndicators();
          this.updateNavigationButtons();
        }
      });

      this.elements.nextButton.addEventListener("click", () => {
        if (this.state.currentPage < this.state.totalPages - 1) {
          this.state.currentPage++;
          this.updateCarouselPosition();
          this.updateCarouselIndicators();
          this.updateNavigationButtons();
        }
      });
    },

    updateCarouselPosition() {
      const track = this.elements.resultsContainer;
      const cardWidth = track.querySelector(".book-card")?.offsetWidth || 280;
      const gap = 25; // Gap between cards
      const offset = this.state.currentPage * (cardWidth + gap) * this.config.booksPerPage;
      track.style.transform = `translateX(-${offset}px)`;
    },

    updateCarouselIndicators() {
      this.elements.carouselIndicators.innerHTML = "";
      for (let i = 0; i < this.state.totalPages; i++) {
        const dot = document.createElement("div");
        dot.className = `carousel-indicator ${i === this.state.currentPage ? "active" : ""}`;
        dot.addEventListener("click", () => {
          this.state.currentPage = i;
          this.updateCarouselPosition();
          this.updateCarouselIndicators();
          this.updateNavigationButtons();
        });
        this.elements.carouselIndicators.appendChild(dot);
      }
    },

    // Generate individual book card
    generateBookCard(book) {
      const card = document.createElement("div");
      card.className = "book-card";

      // Create book cover image
      const coverImg = document.createElement("img");
      coverImg.src = book.volumeInfo.imageLinks?.thumbnail || this.config.placeholderImage;
      coverImg.alt = book.volumeInfo.title;
      coverImg.className = "book-cover";

      // Create book info container
      const infoContainer = document.createElement("div");
      infoContainer.className = "book-info";

      // Create book title
      const title = document.createElement("h3");
      title.className = "book-title";
      title.textContent = book.volumeInfo.title;

      // Create book author
      const author = document.createElement("p");
      author.className = "book-author";
      author.textContent = this.formatAuthors(book.volumeInfo.authors);

      // Create book year
      const year = document.createElement("p");
      year.className = "book-year";
      year.textContent = book.volumeInfo.publishedDate?.split('-')[0] || 'Unknown Year';

      // Create action buttons container
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "book-actions";

      // Create read button
      const readButton = document.createElement("button");
      readButton.className = "action-btn read-btn";
      readButton.innerHTML = '<i class="fas fa-book-open"></i> Read';
      readButton.onclick = () => {
        window.open(book.volumeInfo.previewLink || book.volumeInfo.infoLink || `https://books.google.com/books?id=${book.id}`, '_blank');
      };

      // Create save button
      const saveButton = document.createElement("button");
      saveButton.className = "action-btn save-btn";
      saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Save';
      saveButton.onclick = async () => {
        try {
          // Check if user is logged in
          const user = firebase.auth().currentUser;
          if (!user) {
            window.location.href = 'login.html';
            return;
          }

          const bookData = {
            id: book.id,
            title: book.volumeInfo.title,
            authors: book.volumeInfo.authors || ['Unknown Author'],
            cover: book.volumeInfo.imageLinks?.thumbnail || this.config.placeholderImage,
            description: book.volumeInfo.description || 'No description available',
            publishYear: book.volumeInfo.publishedDate?.split('-')[0] || 'Unknown Year',
            isbn: this.extractBookIdentifier(book.volumeInfo),
            status: 'saved',
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
          };

          const savedBookRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('savedBooks')
            .doc(book.id);

          const doc = await savedBookRef.get();
          if (doc.exists) {
            await savedBookRef.delete();
            saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Save';
            saveButton.classList.remove('saved');
            this.displayNotification('Book removed from saved books', 'success');
          } else {
            await savedBookRef.set(bookData);
            saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
            saveButton.classList.add('saved');
            this.displayNotification('Book saved successfully', 'success');
          }
        } catch (error) {
          console.error('Error saving book:', error);
          this.displayNotification('Failed to save book', 'error');
        }
      };

      // Add buttons to actions container
      actionsContainer.appendChild(readButton);
      actionsContainer.appendChild(saveButton);

      // Add all elements to info container
      infoContainer.appendChild(title);
      infoContainer.appendChild(author);
      infoContainer.appendChild(year);
      infoContainer.appendChild(actionsContainer);

      // Add all elements to card
      card.appendChild(coverImg);
      card.appendChild(infoContainer);

      return card;
    },

    // Utility functions [T3](3)
    extractBookIdentifier(bookInfo) {
      const identifiers = bookInfo.industryIdentifiers;
      if (identifiers && identifiers.length > 0) {
        // Try to get ISBN_13 first, then fallback to any identifier
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

    formatAuthors(authors) {
      if (!authors || authors.length === 0) return "Unknown Author";
      return (
        authors.slice(0, 2).join(", ") + (authors.length > 2 ? " & others" : "")
      );
    },

    sanitizeText(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },

    constructViewLink(identifier) {
      return `https://books.google.com/books?id=${identifier}`;
    },

    // UI State Management [T4](4)
    displayLoadingState() {
      this.elements.resultsContainer.innerHTML = `
                <div class="search-loading-indicator text-center">
                    <div class="spinner-border" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <p class="mt-3">Discovering amazing books...</p>
                </div>
            `;
    },

    animateHeaderTransition() {
      if (this.elements.titleSection) {
        // Animate margin-top to 5px over 1 second (like jQuery version)
        this.elements.titleSection.style.transition = `margin-top ${this.config.animationDuration}ms ease-in-out`;
        this.elements.titleSection.style.marginTop = "5px";
      }
    },

    showBookCollection() {
      if (this.elements.bookCollection) {
        this.elements.bookCollection.style.visibility = "visible";
        this.elements.bookCollection.style.opacity = "1";
      }
    },

    hideBookCollection() {
      if (this.elements.bookCollection) {
        this.elements.bookCollection.style.visibility = "hidden";
        this.elements.bookCollection.style.opacity = "0";
      }
    },

    clearResults() {
      this.elements.resultsContainer.innerHTML = "";
    },

    resetBackgroundImage() {
      document.body.style.backgroundImage = "url('')";
    },

    clearSearchInput() {
      this.elements.searchInput.value = "";
    },

    // Error handling [T4](4) [T5](5)
    showInputError() {
      alert("Search term cannot be empty!");
    },

    showNoResultsMessage() {
      alert("No result!.. try again");
    },

    handleSearchError(error) {
      console.error("Book search error:", error);
      alert("Something went wrong..\nTry again!");
    },

    displayNotification(message, type) {
      const notification = document.createElement("div");
      notification.className = `alert alert-${type} position-fixed`;
      notification.style.top = "20px";
      notification.style.right = "20px";
      notification.style.zIndex = "9999";
      notification.textContent = message;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.remove();
      }, 4000);
    },

    // Setup genre filters
    setupGenreFilters() {
      this.elements.genreFilters.forEach(filter => {
        filter.addEventListener('click', async () => {
          // Remove active class from all filters
          this.elements.genreFilters.forEach(f => f.classList.remove('active'));
          // Add active class to clicked filter
          filter.classList.add('active');
          
          // Update current category
          this.state.currentCategory = filter.dataset.genre;
          
          // Clear current results
          this.clearResults();
          this.displayLoadingState();
          
          try {
            let query = '';
            switch(this.state.currentCategory) {
              case 'fiction':
                query = 'subject:fiction';
                break;
              case 'non-fiction':
                query = 'subject:nonfiction';
                break;
              case 'romance':
                query = 'subject:romance';
                break;
              case 'mystery':
                query = 'subject:mystery';
                break;
              case 'fantasy':
                query = 'subject:fantasy';
                break;
              default:
                query = 'language:eng';
            }
            
            const bookResults = await this.fetchBooksFromAPI(query);
            if (bookResults.totalItems === 0) {
              this.showNoResultsMessage();
              return;
            }
            
            this.animateHeaderTransition();
            this.renderBookCollection(bookResults);
            this.showBookCollection();
          } catch (error) {
            this.handleSearchError(error);
          }
        });
      });
    },

    // Setup sorting functionality
    setupSorting() {
      if (this.elements.sortSelector) {
        this.elements.sortSelector.addEventListener('change', () => {
          this.state.currentSort = this.elements.sortSelector.value;
          this.sortAndDisplayBooks();
        });
      }
    },

    // Sort and display books based on current sort option
    sortAndDisplayBooks() {
      if (!this.state.books.length) return;

      const sortedBooks = [...this.state.books];
      
      switch(this.state.currentSort) {
        case 'newest':
          sortedBooks.sort((a, b) => {
            const dateA = a.volumeInfo.publishedDate || '';
            const dateB = b.volumeInfo.publishedDate || '';
            return dateB.localeCompare(dateA);
          });
          break;
          
        case 'rating':
          sortedBooks.sort((a, b) => {
            const ratingA = a.volumeInfo.averageRating || 0;
            const ratingB = b.volumeInfo.averageRating || 0;
            return ratingB - ratingA;
          });
          break;
          
        case 'title':
          sortedBooks.sort((a, b) => {
            const titleA = a.volumeInfo.title.toLowerCase();
            const titleB = b.volumeInfo.title.toLowerCase();
            return titleA.localeCompare(titleB);
          });
          break;
          
        case 'relevance':
        default:
          // Keep original order for relevance
          break;
      }

      // Update the display with sorted books
      this.state.books = sortedBooks;
      
      // Clear and render books directly instead of calling renderBookCollection
      this.elements.resultsContainer.innerHTML = "";
      sortedBooks.forEach((book) => {
        const card = this.generateBookCard(book);
        this.elements.resultsContainer.appendChild(card);
      });

      this.updateCarouselIndicators();
      this.updateNavigationButtons();
    },
  };

  // Initialize the book search engine
  BookSearchEngine.init();
  // Fetch NYT Best Sellers (hardcover-fiction by default)
  async function fetchNYTBestSellers(list = "hardcover-fiction") {
    const url = `https://api.nytimes.com/svc/books/v3/lists/current/${list}.json?api-key=${NYT_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch NYT bestsellers");
    const data = await response.json();
    return data.results.books;
  }
});
document.querySelectorAll(".suggestion-tag").forEach((tag) => {
  tag.addEventListener("click", function () {
    const query = this.getAttribute("data-query");
    document.getElementById("book-query-input").value = query;
    document.getElementById("discover-books-btn").click();
  });
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const view = this.getAttribute("data-view");

    document
      .querySelectorAll(".nav-link")
      .forEach((l) => l.classList.remove("active"));
    this.classList.add("active");

    // Show/hide hero discovery section and content-main based on view
    const heroSection = document.getElementById("main-header");
    const contentMain = document.querySelector(".content-main");
    
    if (view === "discovery") {
      heroSection.classList.remove("hidden");
      contentMain.classList.remove("hidden");
    } else {
      heroSection.classList.add("hidden");
      contentMain.classList.add("hidden");
    }

    // Hide all view sections first
    document.querySelectorAll('section[id$="-view"]').forEach((section) => {
      section.classList.add("hidden");
    });

    // Show the target section
    const targetSection = document.getElementById(`${view}-view`);
    if (targetSection) {
      targetSection.classList.remove("hidden");
    }

    if (view === "trending") {
      showTrendingNYTBooks();
    }
  });
});

document.documentElement.style.scrollBehavior = "smooth";

// Dashboard Carousel Controls
function setupDashboardCarousel() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const track = document.querySelector('.carousel-track');
    const indicators = document.getElementById('carousel-indicators');
    let currentPage = 0;
    const booksPerPage = 4;
    let totalPages = 0;

    function updateCarouselPosition() {
        const cardWidth = track.querySelector('.book-card')?.offsetWidth || 280;
        const gap = 25; // Gap between cards
        const offset = currentPage * (cardWidth + gap) * booksPerPage;
        track.style.transform = `translateX(-${offset}px)`;
    }

    function updateCarouselIndicators() {
        indicators.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('div');
            dot.className = `carousel-indicator ${i === currentPage ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                currentPage = i;
                updateCarouselPosition();
                updateCarouselIndicators();
            });
            indicators.appendChild(dot);
        }
    }

    function updateNavigationButtons() {
        prevBtn.disabled = currentPage === 0;
        nextBtn.disabled = currentPage === totalPages - 1;
    }

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            updateCarouselPosition();
            updateCarouselIndicators();
            updateNavigationButtons();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages - 1) {
            currentPage++;
            updateCarouselPosition();
            updateCarouselIndicators();
            updateNavigationButtons();
        }
    });

    // Update total pages when books are loaded
    function updateTotalPages(booksCount) {
        totalPages = Math.ceil(booksCount / booksPerPage);
        updateCarouselIndicators();
        updateNavigationButtons();
    }

    return {
        updateTotalPages,
        updateCarouselPosition,
        updateCarouselIndicators
    };
}

// Initialize dashboard carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.book-carousel-container')) {
        const dashboardCarousel = setupDashboardCarousel();
        // You can call dashboardCarousel.updateTotalPages(booksCount) when books are loaded
    }
});
