// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const userProfileBtn = document.getElementById("userProfileBtn");
  const profileDropdown = document.querySelector(".profile-dropdown");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const signOutBtn = document.getElementById("signOutBtn");
  const dashboardLink = document.getElementById("dashboardLink");

  // Function to update UI based on auth state
  function updateUIForAuthState(user) {
    console.log(
      "Updating UI for auth state:",
      user ? "logged in" : "logged out"
    );

    if (user) {
      // User is signed in
      if (userName)
        userName.textContent = user.displayName || user.email.split("@")[0];
      if (userAvatar) {
        if (user.photoURL) {
          userAvatar.src = user.photoURL;
        } else {
          const name = user.displayName || user.email.split("@")[0];
          userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name
          )}&background=8b5cf6&color=fff&size=32`;
        }
      }

      // Add dashboard link to navigation if it doesn't exist
      const navLinks = document.querySelector(".nav-links");
      if (navLinks && !navLinks.querySelector("#dashboardLink")) {
        const dashboardLi = document.createElement("li");
        dashboardLi.id = "dashboardLink";
        dashboardLi.innerHTML = `
                            <a href="dashboard.html" class="nav-link">
                                <i class="fas fa-tachometer-alt"></i>
                                <span>Dashboard</span>
                            </a>
                        `;
        navLinks.appendChild(dashboardLi);
      }

      // Update profile dropdown for logged in user
      if (userProfileBtn && profileDropdown) {
        userProfileBtn.innerHTML = `
                            <img id="userAvatar" src="${userAvatar.src}" alt="User Avatar" class="user-avatar">
                            <span id="userName" class="profile-name">${userName.textContent}</span>
                            <i class="fas fa-chevron-down"></i>
                        `;
        profileDropdown.innerHTML = `
                            <ul>
                                <li><a href="#" id="signOutBtn"><i class="fas fa-sign-out-alt"></i> Sign Out</a></li>
                            </ul>
                        `;

        // Reattach sign out event listener
        const newSignOutBtn = profileDropdown.querySelector("#signOutBtn");
        if (newSignOutBtn) {
          newSignOutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
              await auth.signOut();
              window.location.href = "login.html";
            } catch (error) {
              console.error("Sign out error:", error);
            }
          });
        }
      }
    } else {
      // User is signed out
      if (userName) userName.textContent = "Reader";
      if (userAvatar)
        userAvatar.src =
          "https://ui-avatars.com/api/?name=Reader&background=8b5cf6&color=fff&size=32";

      // Remove dashboard link from navigation
      const dashboardLi = document.querySelector("#dashboardLink");
      if (dashboardLi) {
        dashboardLi.remove();
      }

      // Update profile dropdown for logged out user
      if (userProfileBtn && profileDropdown) {
        userProfileBtn.innerHTML = `
                            <i class="fas fa-user-circle"></i>
                            <span class="profile-name">Reader</span>
                            <i class="fas fa-chevron-down"></i>
                        `;
        profileDropdown.innerHTML = `
                            <ul>
                                <li><a href="login.html"><i class="fas fa-sign-in-alt"></i> Sign In</a></li>
                                <li><a href="login.html?signup=true"><i class="fas fa-user-plus"></i> Sign Up</a></li>
                            </ul>
                        `;
      }
    }
  }

  // Check initial auth state
  auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user ? "logged in" : "logged out");
    updateUIForAuthState(user);
  });

  // Toggle profile dropdown
  if (userProfileBtn) {
    userProfileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      profileDropdown.classList.toggle("hidden");
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      profileDropdown &&
      !userProfileBtn.contains(e.target) &&
      !profileDropdown.contains(e.target)
    ) {
      profileDropdown.classList.add("hidden");
    }
  });

  // Prevent dropdown from closing when clicking inside it
  if (profileDropdown) {
    profileDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Handle navigation
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const view = e.currentTarget.dataset.view;
      if (view) {
        e.preventDefault();

        // Update active state of navigation links
        document.querySelectorAll(".nav-link").forEach((navLink) => {
          navLink.classList.remove("active");
        });
        e.currentTarget.classList.add("active");

        // Hide all view sections first
        const discoveryView = document.getElementById("discovery-view");
        const trendingView = document.getElementById("trending-view");
        const libraryView = document.getElementById("library-view");

        if (discoveryView) discoveryView.classList.add("hidden");
        if (trendingView) trendingView.classList.add("hidden");
        if (libraryView) libraryView.classList.add("hidden");

        // Show the selected view
        const targetView = document.getElementById(`${view}-view`);
        if (targetView) targetView.classList.remove("hidden");

        // Show/hide hero section based on view
        const heroSection = document.getElementById("main-header");
        if (heroSection) {
          if (view === "discovery") {
            heroSection.classList.remove("hidden");
          } else {
            heroSection.classList.add("hidden");
          }
        }

        // If library view is selected, load user's books
        if (view === "library") {
          loadUserLibrary();
        }
      }
    });
  });

  // Add click handler for dashboard link
  document.addEventListener("click", (e) => {
    if (e.target.closest("#dashboardLink")) {
      e.preventDefault();
      window.location.href = "dashboard.html";
    }
  });

  // Function to load user's library
  async function loadUserLibrary() {
    const emptyState = document.getElementById("empty-library-state");
    const libraryBooks = document.getElementById("library-books");
    const savedCount = document.getElementById("saved-count");
    const readingCount = document.getElementById("reading-count");

    try {
      const user = auth.currentUser;
      if (!user) {
        emptyState.style.display = "block";
        libraryBooks.style.display = "none";
        return;
      }

      const userRef = db.collection("users").doc(user.uid);
      const [savedBooksSnapshot, readingListSnapshot, completedBooksSnapshot] =
        await Promise.all([
          userRef.collection("savedBooks").get(),
          userRef.collection("readingList").get(),
          userRef.collection("completedBooks").get(),
        ]);

      const savedBooks = [];
      const readingBooks = [];
      const completedBooks = [];

      savedBooksSnapshot.forEach((doc) =>
        savedBooks.push({ id: doc.id, ...doc.data() })
      );
      readingListSnapshot.forEach((doc) =>
        readingBooks.push({ id: doc.id, ...doc.data() })
      );
      completedBooksSnapshot.forEach((doc) =>
        completedBooks.push({ id: doc.id, ...doc.data() })
      );

      // Update counts
      savedCount.textContent = savedBooks.length;
      readingCount.textContent = readingBooks.length;

      // If user has no books
      if (
        savedBooks.length === 0 &&
        readingBooks.length === 0 &&
        completedBooks.length === 0
      ) {
        emptyState.style.display = "block";
        libraryBooks.style.display = "none";
        return;
      }

      // Show library books section
      emptyState.style.display = "none";
      libraryBooks.style.display = "block";

      // Create HTML for each section
      let libraryHTML = "";

      if (readingBooks.length > 0) {
        libraryHTML += `
                            <div class="library-section">
                                <h3>Currently Reading</h3>
                                <div class="books-grid">
                                    ${readingBooks
                                      .map((book) =>
                                        createBookCard(book, "reading")
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `;
      }

      if (savedBooks.length > 0) {
        libraryHTML += `
                            <div class="library-section">
                                <h3>Saved Books</h3>
                                <div class="books-grid">
                                    ${savedBooks
                                      .map((book) =>
                                        createBookCard(book, "saved")
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `;
      }

      if (completedBooks.length > 0) {
        libraryHTML += `
                            <div class="library-section">
                                <h3>Completed Books</h3>
                                <div class="books-grid">
                                    ${completedBooks
                                      .map((book) =>
                                        createBookCard(book, "completed")
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `;
      }

      libraryBooks.innerHTML = libraryHTML;
    } catch (error) {
      console.error("Error loading library:", error);
      showToast("Failed to load your library", "error");
    }
  }

  // Function to create book card HTML
  function createBookCard(book, status) {
    const progress = book.readingProgress || 0;
    const rating = book.rating || 0;

    return `
                    <div class="book-card">
                        <div class="book-cover-container">
                            <img src="${
                              book.cover
                            }" alt="${book.title}" class="book-cover">
                        </div>
                        <div class="book-info">
                            <h3 class="book-title">${book.title}</h3>
                            <p class="book-author">${book.authors.join(
                              ", "
                            )}</p>
                            ${
                              status === "reading" || status === "saved"
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
                            ${
                              status === "completed"
                                ? `
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
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                `;
  }
});
