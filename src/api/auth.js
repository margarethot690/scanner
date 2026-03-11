/**
 * Standalone auth module using localStorage.
 * Replaces the Base44 SDK auth system with a simple local implementation.
 * 
 * User object shape: { id, full_name, email, role, node_owner, created_date }
 */

const STORAGE_KEYS = {
  USER: 'dccscan_user',
  USERS: 'dccscan_users',
  TOKEN: 'dccscan_token',
};

function generateId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateToken(userId) {
  return btoa(JSON.stringify({ userId, ts: Date.now() }));
}

function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function setCurrentSession(user, token) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

function clearCurrentSession() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  // Also clean up legacy keys
  localStorage.removeItem('base44_access_token');
  localStorage.removeItem('token');
}

export const auth = {
  /**
   * Get the currently logged-in user, or null if not logged in.
   */
  me() {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) return null;
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      if (!raw) return null;
      const user = JSON.parse(raw);
      // Verify user still exists in the users DB
      const users = getUsers();
      const found = users.find(u => u.id === user.id);
      return found || null;
    } catch {
      return null;
    }
  },

  /**
   * Register a new user. First user is automatically admin.
   */
  register({ full_name, email, password }) {
    if (!email || !password || !full_name) {
      throw new Error('Full name, email, and password are required');
    }
    const users = getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists');
    }
    const isFirstUser = users.length === 0;
    const user = {
      id: generateId(),
      full_name,
      email: email.toLowerCase(),
      password_hash: btoa(password), // Simple encoding for local-only auth
      role: isFirstUser ? 'admin' : 'user',
      node_owner: false,
      created_date: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    setCurrentSession(safeUser, token);
    return safeUser;
  },

  /**
   * Log in with email and password.
   */
  login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password_hash !== btoa(password)) {
      throw new Error('Invalid email or password');
    }
    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    setCurrentSession(safeUser, token);
    return safeUser;
  },

  /**
   * Log out the current user.
   */
  logout() {
    clearCurrentSession();
  },

  /**
   * Update current user's profile data.
   */
  updateMe(data) {
    const current = this.me();
    if (!current) throw new Error('Not authenticated');
    const users = getUsers();
    const idx = users.findIndex(u => u.id === current.id);
    if (idx === -1) throw new Error('User not found');
    // Only allow updating safe fields
    const allowedFields = ['full_name', 'node_api_url', 'node_name', 'node_ownership_percentage'];
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        users[idx][key] = data[key];
      }
    }
    saveUsers(users);
    const { password_hash, ...safeUser } = users[idx];
    setCurrentSession(safeUser, localStorage.getItem(STORAGE_KEYS.TOKEN));
    return safeUser;
  },

  /**
   * List all users (admin only).
   */
  listUsers() {
    return getUsers().map(({ password_hash, ...u }) => u);
  },

  /**
   * Update any user by ID (admin only).
   */
  updateUser(userId, data) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    const allowedFields = ['role', 'node_owner', 'full_name', 'node_api_url', 'node_name', 'node_ownership_percentage', 'locked_dcc_tokens'];
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        users[idx][key] = data[key];
      }
    }
    saveUsers(users);
    const { password_hash, ...safeUser } = users[idx];
    return safeUser;
  },

  /**
   * Check if currently authenticated.
   */
  isAuthenticated() {
    return this.me() !== null;
  },

  /**
   * Seed default admin account if no users exist or if the admin is missing.
   * Called once on app initialization.
   */
  seedDefaultAdmin() {
    const users = getUsers();
    const adminEmail = 'dylanpersonguy@gmail.com';
    const exists = users.find(u => u.email.toLowerCase() === adminEmail);
    if (!exists) {
      const user = {
        id: generateId(),
        full_name: 'Dylan',
        email: adminEmail,
        password_hash: btoa('Iamilikecds1!'),
        role: 'admin',
        node_owner: false,
        created_date: new Date().toISOString(),
      };
      users.push(user);
      saveUsers(users);
    }
  },
};
