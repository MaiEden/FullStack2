"use strict";

/*
  Storage layer using LocalStorage.
*/

const StorageAPI = (() => {
  // LocalStorage keys used by the application
  const KEYS = {
    users: "na_users",
    session: "na_session",
    locks: "na_locks"
  };

  // Safely load and parse JSON from LocalStorage
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  // Save a value to LocalStorage as JSON
  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Retrieve all registered users
  function getUsers() {
    return load(KEYS.users, []);
  }

  // Persist the users array
  function setUsers(users) {
    save(KEYS.users, users);
  }

  // Find a user by username (case-insensitive)
  function findUserByUsername(username) {
    const users = getUsers();
    return (
      users.find(
        u => u.username.toLowerCase() === username.toLowerCase()
      ) || null
    );
  }

  // Create and store a new user
  function createUser({ username, password, fullName, email }) {
    const users = getUsers();

    // Generate a unique ID (fallback for older browsers)
    const id = crypto?.randomUUID
      ? crypto.randomUUID()
      : String(Date.now());

    const user = {
      id,
      username,
      password, // NOTE: Passwords are stored in plain text.
      fullName,
      email,
      createdAt: new Date().toISOString(),
      stats: {
        totalLogins: 0,
        points: 0,
        lastPlayed: null
      }
    };

    users.push(user);
    setUsers(users);
    return user;
  }

  // Get the current session object
  function getSession() {
    return load(KEYS.session, null);
  }

  // Store the current session
  function setSession(sessionObj) {
    save(KEYS.session, sessionObj);
  }

  // Remove the active session
  function clearSession() {
    localStorage.removeItem(KEYS.session);
  }

  /*
    Basic user lock mechanism:
  */
  function getLocks() {
    return load(KEYS.locks, {});
  }

  // Persist lock information
  function setLocks(locks) {
    save(KEYS.locks, locks);
  }

  // Public API
  return {
    getUsers,
    setUsers,
    findUserByUsername,
    createUser,
    getSession,
    setSession,
    clearSession,
    getLocks,
    setLocks
  };
})();