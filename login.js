const CREDENTIALS = {
  passive: {
    username: "passive",
    password: "passive123",
    role: "passive"
  },
  active: {
    username: "active",
    password: "active123",
    role: "active"
  }
};

const SESSION_KEY = "cityvoice_user_session";

function setUserSession(role, username) {
  const session = {
    role: role,
    username: username,
    loginTime: Date.now()
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getUserSession() {
  const stored = sessionStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
}

function clearUserSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function authenticate(username, password) {
  const user = Object.values(CREDENTIALS).find(
    cred => cred.username === username && cred.password === password
  );
  return user ? user.role : null;
}

function showError(message) {
  const errorEl = document.getElementById("errorMessage");
  errorEl.textContent = message;
  errorEl.classList.add("show");
  setTimeout(() => {
    errorEl.classList.remove("show");
  }, 5000);
}

function handleLogin(role, username) {
  setUserSession(role, username);
  window.location.replace("map.html");
}

const loginForm = document.getElementById("loginForm");
const quickPassiveBtn = document.getElementById("quickPassive");
const quickActiveBtn = document.getElementById("quickActive");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  
  if (!username || !password) {
    showError("Please enter both username and password");
    return;
  }
  
  const role = authenticate(username, password);
  
  if (role) {
    handleLogin(role, username);
  } else {
    showError("Invalid username or password");
  }
});

quickPassiveBtn.addEventListener("click", () => {
  handleLogin("passive", CREDENTIALS.passive.username);
});

quickActiveBtn.addEventListener("click", () => {
  handleLogin("active", CREDENTIALS.active.username);
});

const session = getUserSession();
if (session) {
  window.location.replace("map.html");
}

