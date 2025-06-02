// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBMHnNuoQ6bjKMjn2G65ggS12gKi4AWePg",
    authDomain: "onlinelibrary-49df0.firebaseapp.com",
    projectId: "onlinelibrary-49df0",
    storageBucket: "onlinelibrary-49df0.appspot.com",
    messagingSenderId: "795444237740",
    appId: "1:795444237740:web:871ca38c2799939b761609",
    measurementId: "G-2Y02G9CSLH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Authentication functions
window.signInWithGoogle = async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        // Save user data to Firestore
        await db.collection("users").doc(result.user.uid).set({
            name: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        
        return result;
    } catch (error) {
        throw error;
    }
};

window.signInWithEmail = async (email, password) => {
    try {
        return await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        throw error;
    }
};

window.createAccount = async (email, password, displayName = null) => {
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        
        // Save user data to Firestore
        const userData = {
            email: result.user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        
        if (displayName) {
            userData.name = displayName;
        }
        
        await db.collection("users").doc(result.user.uid).set(userData);
        
        return result;
    } catch (error) {
        throw error;
    }
};

window.checkAuthState = (callback) => {
    return auth.onAuthStateChanged(callback);
};
