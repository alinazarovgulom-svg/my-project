const USERS_KEY = 'finance_users';

const hashPassword = (password) => btoa(encodeURIComponent(password));

export const getUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const register = (username, password, fullName) => {
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return { success: false, error: "Bu foydalanuvchi nomi allaqachon band" };
  }
  const newUser = {
    id: Date.now().toString(),
    username,
    fullName,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  return { success: true, user: { id: newUser.id, username, fullName } };
};

export const login = (username, password) => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.passwordHash === hashPassword(password));
  if (!user) return { success: false, error: "Foydalanuvchi nomi yoki parol noto'g'ri" };
  return { success: true, user: { id: user.id, username: user.username, fullName: user.fullName } };
};

export const changePassword = (userId, oldPassword, newPassword) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: "Foydalanuvchi topilmadi" };
  if (users[idx].passwordHash !== hashPassword(oldPassword)) {
    return { success: false, error: "Eski parol noto'g'ri" };
  }
  users[idx].passwordHash = hashPassword(newPassword);
  saveUsers(users);
  return { success: true };
};

export const getCurrentUser = () => {
  try {
    const raw = sessionStorage.getItem('finance_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user) => {
  if (user) {
    sessionStorage.setItem('finance_current_user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('finance_current_user');
  }
};
