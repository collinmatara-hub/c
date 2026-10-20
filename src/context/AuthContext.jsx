import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('matara_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);

  useEffect(() => {
    if (user) localStorage.setItem('matara_user', JSON.stringify(user));
  }, [user]);

  // Refresh the saved account details on start, so a role change or a "view as" session is
  // always reflected (the server is the source of truth for the role).
  useEffect(() => {
    if (!localStorage.getItem('matara_user')) return;
    api.get('/auth/me').then(({ data }) => {
      const me = data.user;
      setUser((current) => current && { ...current, id: me.id, name: me.name, email: me.email, role: me.role, imp: me.imp || null });
    }).catch(() => {});
  }, []);

  // Super administrator: see the system as another user (read-only, one hour).
  async function viewAs(id) {
    const { data } = await api.post(`/role-ops/impersonate/${id}`);
    if (data.token) localStorage.setItem('matara_token', data.token);
    const next = { ...data.user, imp: data.impersonated_by };
    localStorage.setItem('matara_user', JSON.stringify(next));
    setUser(next);
    return next;
  }

  async function exitView() {
    const { data } = await api.post('/role-ops/impersonate/exit');
    if (data.token) localStorage.setItem('matara_token', data.token);
    localStorage.setItem('matara_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function login(email, password) {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.requires2fa) { setTwoFactorChallenge(data.challenge); return { ...data.user, requires2fa: true }; }
      if (data.token) localStorage.setItem('matara_token', data.token);
      localStorage.setItem('matara_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not log in. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyTwoFactor(code) { setLoading(true); try { const {data}=await api.post('/auth/2fa/verify-login',{challenge:twoFactorChallenge,code}); if(data.token) localStorage.setItem('matara_token',data.token); localStorage.setItem('matara_user',JSON.stringify(data.user)); setUser(data.user); setTwoFactorChallenge(null); return data.user; } catch(err){ const msg=err.response?.data?.error||'Invalid two-factor code.'; setError(msg); throw new Error(msg); } finally { setLoading(false); } }

  async function logout() {
    try { await api.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem('matara_token');
    localStorage.removeItem('matara_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, viewAs, exitView, login, verifyTwoFactor, twoFactorChallenge, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
