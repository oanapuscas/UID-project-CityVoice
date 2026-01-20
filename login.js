const USERS_STORAGE_KEY = "cityvoice_users";
const SESSION_KEY = "cityvoice_user_session";
 
function getUsers() {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}
 
function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}
 
function registerUser(username, password) {
  const users = getUsers();
  
  if (users[username]) {
    return { success: false, message: "Username already exists" };
  }
  
  users[username] = {
    username: username,
    password: password, 
    createdAt: Date.now()
  };
  
  saveUsers(users);
  return { success: true, message: "Account created successfully!" };
}
 
function authenticate(username, password) {
  const users = getUsers();
  const user = users[username];
  
  if (!user) {
    return { success: false, message: "Username not found" };
  }
  
  if (user.password !== password) {
    return { success: false, message: "Incorrect password" };
  }
  
  return { success: true, user: user };
}
 
function setUserSession(username) {
  const session = {
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
 
function showError(message) {
  const errorEl = document.getElementById("errorMessage");
  const successEl = document.getElementById("successMessage");
  
  successEl.classList.remove("show");
  errorEl.textContent = message;
  errorEl.classList.add("show");
  
  setTimeout(() => {
    errorEl.classList.remove("show");
  }, 5000);
}

function showSuccess(message) {
  const errorEl = document.getElementById("errorMessage");
  const successEl = document.getElementById("successMessage");
  
  errorEl.classList.remove("show");
  successEl.textContent = message;
  successEl.classList.add("show");
  
  setTimeout(() => {
    successEl.classList.remove("show");
  }, 3000);
}

function handleLogin(username) {
  setUserSession(username);
  window.location.replace("map.html");
}
 
const session = getUserSession();
if (session) {
  window.location.replace("map.html");
}
 
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const toggleModeBtn = document.getElementById("toggleModeBtn");
const toggleText = document.getElementById("toggleText");
const formDescription = document.getElementById("formDescription");

let isLoginMode = true;
 
toggleModeBtn.addEventListener("click", () => {
  isLoginMode = !isLoginMode;
  
  if (isLoginMode) {
    loginForm.classList.add("active");
    registerForm.classList.remove("active");
    toggleText.textContent = "Don't have an account?";
    toggleModeBtn.textContent = "Register here";
    formDescription.textContent = "Sign in to report and support city issues";
  } else {
    loginForm.classList.remove("active");
    registerForm.classList.add("active");
    toggleText.textContent = "Already have an account?";
    toggleModeBtn.textContent = "Login here";
    formDescription.textContent = "Create your account to get started";
  }
   
  document.getElementById("errorMessage").classList.remove("show");
  document.getElementById("successMessage").classList.remove("show");
});
 
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  
  if (!username || !password) {
    showError("Please enter both username and password");
    return;
  }
  
  const result = authenticate(username, password);
  
  if (result.success) {
    handleLogin(username);
  } else {
    showError(result.message);
  }
});
 
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  const passwordConfirm = document.getElementById("registerPasswordConfirm").value;
  
  if (!username || !password || !passwordConfirm) {
    showError("Please fill in all fields");
    return;
  }
  
  if (username.length < 3) {
    showError("Username must be at least 3 characters");
    return;
  }
  
  if (password.length < 4) {
    showError("Password must be at least 4 characters");
    return;
  }
  
  if (password !== passwordConfirm) {
    showError("Passwords do not match");
    return;
  }
  
  const result = registerUser(username, password);
  
  if (result.success) {
    showSuccess(result.message);
     
    document.getElementById("registerUsername").value = "";
    document.getElementById("registerPassword").value = "";
    document.getElementById("registerPasswordConfirm").value = "";
     
    setTimeout(() => {
      toggleModeBtn.click();
    }, 1500);
  } else {
    showError(result.message);
  }
});