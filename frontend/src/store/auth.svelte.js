class AuthStore {
  user = $state(null);
  token = $state(null);
  isAuthenticated = $derived(this.token !== null);

  constructor() {
    // Restore session if exists in localStorage (Advanced Feature)
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (savedToken && savedUser) {
        this.token = savedToken;
        try {
          this.user = JSON.parse(savedUser);
        } catch (e) {
          this.user = null;
          this.token = null;
        }
      }
    }
  }

  setSession(user, token) {
    this.user = user;
    this.token = token;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearSession() {
    this.user = null;
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export const authStore = new AuthStore();
