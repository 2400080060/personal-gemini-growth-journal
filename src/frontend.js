import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

/*
 * Firebase Web Configuration
 *
 * This configuration is safe to use in the frontend.
 * Do NOT put the Gemini API key or any server-side secret here.
 */
const firebaseConfig = {
  apiKey: "AIzaSyB73GPj6P_HI4RPcfqINOmXpam4rlHwANo",
  authDomain: "personal-gemini-growth-journal.firebaseapp.com",
  projectId: "personal-gemini-growth-journal",
  storageBucket: "personal-gemini-growth-journal.firebasestorage.app",
  messagingSenderId: "302524930437",
  appId: "1:302524930437:web:81b64c6d23c48a3ba3ccec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Request Google's standard account-selection flow.
provider.setCustomParameters({
  prompt: "select_account"
});

// DOM elements
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");

const userSection = document.getElementById("userSection");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const status = document.getElementById("status");

/*
 * Safely update the status message.
 */
function setStatus(message) {
  status.textContent = message;
}

/*
 * Disable/enable buttons while authentication is in progress.
 */
function setAuthLoading(isLoading) {
  signInButton.disabled = isLoading;
  signOutButton.disabled = isLoading;
}

/*
 * Google Sign-In
 */
signInButton.addEventListener("click", async () => {
  try {
    setAuthLoading(true);
    setStatus("Signing you in with Google...");

    await signInWithPopup(auth, provider);

    // onAuthStateChanged will handle the authenticated user.
  } catch (error) {
    console.error("Google sign-in failed:", {
      code: error?.code || "unknown",
      message: error?.message || "Unknown authentication error"
    });

    if (error?.code === "auth/popup-closed-by-user") {
      setStatus("The Google sign-in window was closed. Please try again.");
    } else if (error?.code === "auth/popup-blocked") {
      setStatus(
        "Your browser blocked the Google sign-in window. Please allow popups and try again."
      );
    } else if (error?.code === "auth/unauthorized-domain") {
      setStatus(
        "This application domain is not authorized in Firebase Authentication."
      );
    } else {
      setStatus(
        `Sign-in failed: ${error?.code || "unknown error"}`
      );
    }
  } finally {
    setAuthLoading(false);
  }
});

/*
 * Sign Out
 */
signOutButton.addEventListener("click", async () => {
  try {
    setAuthLoading(true);
    setStatus("Signing you out...");

    await signOut(auth);

    setStatus("You have been signed out.");
  } catch (error) {
    console.error("Sign-out failed:", {
      code: error?.code || "unknown",
      message: error?.message || "Unknown sign-out error"
    });

    setStatus("Sign-out failed. Please try again.");
  } finally {
    setAuthLoading(false);
  }
});

/*
 * Firebase authentication state listener.
 *
 * This runs whenever:
 * - the user signs in
 * - the user signs out
 * - Firebase restores an existing session
 */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    signInButton.hidden = false;
    userSection.hidden = true;

    userName.textContent = "";
    userEmail.textContent = "";

    setAuthLoading(false);

    return;
  }

  // User is authenticated with Firebase.
  signInButton.hidden = true;
  userSection.hidden = false;

  userName.textContent = user.displayName || "User";
  userEmail.textContent = user.email || "";

  setStatus("Verifying your secure connection...");

  try {
    /*
     * Firebase ID token.
     *
     * This token is sent to our backend.
     * The backend verifies it using Firebase Admin SDK.
     */
    const idToken = await user.getIdToken();

    const response = await fetch("/api/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log("Authenticated backend user:", {
      uid: data.uid,
      email: data.email
    });

    setStatus(
      "You're signed in. Your personal journal is private to you."
    );
  } catch (error) {
    console.error("Secure backend connection failed:", {
      message: error?.message || "Unknown backend error"
    });

    setStatus(
      "Signed in with Google, but the secure backend connection needs attention."
    );
  }
});
