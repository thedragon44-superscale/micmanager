import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const API_URL = "http://127.0.0.1:8000";

  // Decode the JWT token to get the user data whenever the token changes
  useEffect(() => {
    if (token) {
      try {
        // A JWT is 3 parts separated by dots. The middle part is the payload.
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.user_id, username: payload.sub });
        localStorage.setItem('token', token);
      } catch (e) {
        console.error("Invalid token");
        logout();
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        // OAuth2 requires URL-encoded form data, not JSON
        body: new URLSearchParams({ username, password })
      });
      if (!res.ok) throw new Error("Invalid username or password");
      
      const data = await res.json();
      setToken(data.access_token);
      toast.success(`Welcome back, ${username}!`);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }
      toast.success("Account created! Logging you in...");
      // Auto-login after successful registration
      return await login(username, password);
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    toast.success("Logged out.");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
