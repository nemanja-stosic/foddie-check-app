import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDAEshcJwkRNB8Pk6sS0HiX6fzGXeIng7c",
    authDomain: "foddie-check-db.firebaseapp.com",
    projectId: "foddie-check-db",
    storageBucket: "foddie-check-db.appspot.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailInput = document.getElementById("email-input-field");
const passwordInput = document.getElementById("password-input-field");
const passwordConfirmInput = document.getElementById("password-input-field-confirm");
const signupButton = document.getElementById("signup-button");

const loginFormContainer = document.getElementById("login-form");
const verifyContainer = document.getElementById("verify-container");

const errorMessageContainer = document.getElementById("error-container");
const errorMessage = document.getElementById("error-message");

let timer;

onAuthStateChanged(auth, (user) => {
    // User is signed in
    if (user) {
        if (!user.emailVerified) {
            sendAndVerifyUserEmail();

            //checking every 3 seconds to see if user clicked email link
            timer = setInterval(() => {
                checkUserState();
            }, 3000);
        } else {
            window.location.href = "../view/main.html";
        }
    }
});

signupButton.addEventListener("click", () => {
    if (validateFields()) {
        //create account
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = passwordConfirmInput.value.trim();

        if (password === confirmPassword) {
            createUserWithEmailAndPassword(auth, email, password)
                .then(() => {
                    // Signed up -- first need to verify email loginFormContainer
                    loginFormContainer.style.display = "none";
                    verifyContainer.style.display = "block";
                })
                .catch((error) => {
                    console.error(error.message);
                });
        } else {
            errorMessage.innerHTML = "Passwords do not match!";
            errorMessageContainer.style.display = "block";
        }
    } else {
        errorMessage.innerHTML = "Enter all data required!";
    }
});

function validateFields() {
    let emailValue = emailInput.value;
    let passwordValue = passwordInput.value;
    let passwordConfirmValue = passwordConfirmInput.value;
    if (
        emailValue === "" ||
        emailValue === null ||
        passwordValue === "" ||
        passwordValue === null ||
        passwordConfirmValue === "" ||
        passwordConfirmValue === null
    ) {
        errorMessageContainer.style.display = "block";
        return false;
    } else {
        return true;
    }
}

function sendAndVerifyUserEmail() {
    sendEmailVerification(auth.currentUser)
        .then(() => {
            // Email verification sent!
            console.log("all good");
        })
        .catch((error) => {
            console.error(error);
        });
}

async function checkUserState() {
    //reload state of user to update if he clicks verification link
    await auth.currentUser.reload();

    onAuthStateChanged(auth, (user) => {
        // User is signed in
        if (user.emailVerified) {
            stopTimer();
            clearAuthFields();
            window.location.href = "../view/main.html";
            // showProfilePicture(userProfilePictureEl, user);
            // showUserGreeting(userGreetingEl, user);
        }
    });
}

function stopTimer() {
    clearInterval(timer);
}

function clearAuthFields() {
    clearInputField(emailInput);
    clearInputField(passwordInput);
    clearInputField(passwordConfirmInput);
}


function clearInputField(field) {
    field.value = "";
}