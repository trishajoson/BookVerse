document.addEventListener('DOMContentLoaded', function() {
        const errorDiv = document.getElementById("error-message");
        const loginForm = document.getElementById("loginForm");
        const googleSignInBtn = document.getElementById("googleSignIn");
        const showSignUpLink = document.getElementById("showSignUp");
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
        const loginHeader = document.querySelector(".login-header h1");
        const loginSubheader = document.querySelector(".login-header p");
        const submitBtn = document.querySelector(".signin-btn");

        // Check URL parameters for signup mode
        const urlParams = new URLSearchParams(window.location.search);
        const isSignUpMode = urlParams.get('signup') === 'true';
        
        // Initialize the form state based on URL parameter
        if (isSignUpMode) {
            signUpMode();
        }

        function showError(message) {
            errorDiv.innerHTML = `<div class="error">${message}</div>`;
            errorDiv.style.display = 'block';
        }

        function clearError() {
            errorDiv.innerHTML = "";
            errorDiv.style.display = 'none';
        }

        // Google Sign In
        googleSignInBtn.addEventListener("click", async () => {
            try {
                clearError();
                googleSignInBtn.disabled = true;
                googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
                await signInWithGoogle();
                window.location.href = "dashboard.html";
            } catch (error) {
                showError(error.message || "Failed to sign in with Google. Please try again.");
                googleSignInBtn.disabled = false;
                googleSignInBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google';
            }
        });

        // Email/Password Authentication
        let isSignUp = isSignUpMode;

        async function handleFormSubmit(e) {
            e.preventDefault();
            try {
                clearError();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;

                if (!email || !password) {
                    showError("Please fill in all fields");
                    return;
                }

                if (isSignUp) {
                    if (password.length < 6) {
                        showError("Password must be at least 6 characters long");
                        return;
                    }
                    if (password !== confirmPassword) {
                        showError("Passwords do not match");
                        return;
                    }
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                if (isSignUp) {
                    await createAccount(email, password);
                } else {
                    await signInWithEmail(email, password);
                }
                window.location.href = "dashboard.html";
            } catch (error) {
                showError(error.message || "Authentication failed. Please try again.");
                submitBtn.disabled = false;
                submitBtn.innerHTML = isSignUp ? "Create Account" : "Sign In";
            }
        }

        loginForm.addEventListener("submit", handleFormSubmit);

        function signUpMode(e) {
            if (e) e.preventDefault();
            isSignUp = true;
            loginHeader.textContent = "Create Account";
            loginSubheader.textContent = "Create an account to build your personal library";
            submitBtn.textContent = "Create Account";
            document.querySelector(".signup-link").innerHTML =
                'Already have an account? <a href="login.html">Sign In</a>';
            confirmPasswordGroup.style.display = 'block';
            // Update URL without reloading the page
            window.history.pushState({}, '', 'login.html?signup=true');
        }

        function toggleToSignIn(e) {
            if (e) e.preventDefault();
            isSignUp = false;
            loginHeader.textContent = "Welcome to BookVerse";
            loginSubheader.textContent = "Sign in to access your personal library";
            submitBtn.textContent = "Sign In";
            document.querySelector(".signup-link").innerHTML =
                'Don\'t have an account? <a href="login.html?signup=true" id="showSignUp">Create Account</a>';
            confirmPasswordGroup.style.display = 'none';
            // Update URL without reloading the page
            window.history.pushState({}, '', 'login.html');
        }

        // Add click handlers for the links
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'showSignUp') {
              signUpMode(e);
            } else if (e.target && e.target.matches('a[href="login.html"]')) {
                toggleToSignIn(e);
            }
        });

        // Check if user is already logged in
        checkAuthState((user) => {
            if (user) {
                window.location.href = "dashboard.html";
            }
        });
      });