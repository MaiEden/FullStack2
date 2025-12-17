"use strict";

/*
  שכבת אחסון: LocalStorage בלבד.
  אתם תרחיבו בהמשך: היסטוריית משחקים, זמנים, הישגים, ניסיונות כושלים וכו'.
*/

const StorageAPI = (() => {
  const KEYS = {
    users: "na_users",
    session: "na_session",
    locks: "na_locks"
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUsers() {
    return load(KEYS.users, []);
  }

  function setUsers(users) {
    save(KEYS.users, users);
  }

  function findUserByUsername(username) {
    const users = getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  function createUser({ username, password, fullName, email }) {
    const users = getUsers();
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
    const user = {
      id,
      username,
      password, // בפרויקט אמיתי לא שומרים כך. כאן זה תרגול בלבד.
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

  function getSession() {
    return load(KEYS.session, null);
  }

  function setSession(sessionObj) {
    save(KEYS.session, sessionObj);
  }

  function clearSession() {
    localStorage.removeItem(KEYS.session);
  }

  // נעילת משתמש בסיסית (שלד): username -> { failed, lockedUntilISO }
  function getLocks() {
    return load(KEYS.locks, {});
  }

  function setLocks(locks) {
    save(KEYS.locks, locks);
  }

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
