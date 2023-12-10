import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAEshcJwkRNB8Pk6sS0HiX6fzGXeIng7c",
  authDomain: "foddie-check-db.firebaseapp.com",
  databaseURL: "https://foddie-check-db-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "foddie-check-db",
  storageBucket: "foddie-check-db.appspot.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const emailInput = document.getElementById("email-input-field");
const passwordInput = document.getElementById("password-input-field");
const loginButton = document.getElementById("login-button");
const signInWithGoogleButton = document.getElementById("sign-in-with-google-btn");

const errorMessageContainer = document.getElementById("error-container");
const errorMessage = document.getElementById("error-message");

onAuthStateChanged(auth, (user) => {
  // User is signed in with Google and no need to verify email it will always be verifed
  if (user) {
    window.location.href = "../view/main.html";
  }
});

loginButton.addEventListener("click", () => {
  if (validateFields()) {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        console.log(user);
      })
      .catch((error) => {
        errorMessage.innerHTML = "Incorrect email or password!";
        errorMessageContainer.style.display = "block";
        console.error(error.message);
      });
  } else {
    errorMessage.innerHTML = "Enter all data required!";
  }
});

signInWithGoogleButton.addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then(() => {
      console.log("signed in with google");
    })
    .catch((error) => {
      console.error(error.message);
    });
});

function validateFields() {
  let emailValue = emailInput.value;
  let passwordValue = passwordInput.value;
  if (
    emailValue === "" ||
    emailValue === null ||
    passwordValue === "" ||
    passwordValue === null
  ) {
    errorMessageContainer.style.display = "block";
    return false;
  } else {
    return true;
  }
}
