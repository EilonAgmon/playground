(() => {
  "use strict";

  const MAX_LEN = 20;
  const STORAGE_KEY = "travel_username";

  const loginScreen = document.getElementById("loginScreen");
  const homeScreen = document.getElementById("homeScreen");
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const loginError = document.getElementById("loginError");
  const welcome = document.getElementById("welcome");
  const switchUser = document.getElementById("switchUser");

  function showHome(username) {
    welcome.textContent = `welcome, ${username}`;
    loginScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
  }

  function showLogin() {
    homeScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    usernameInput.value = "";
    usernameInput.focus();
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim().slice(0, MAX_LEN);
    if (!username) {
      loginError.classList.remove("hidden");
      return;
    }
    loginError.classList.add("hidden");
    localStorage.setItem(STORAGE_KEY, username);
    showHome(username);
  });

  switchUser.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem(STORAGE_KEY);
    showLogin();
  });

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    showHome(stored);
  } else {
    showLogin();
  }
})();
