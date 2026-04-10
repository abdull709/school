
import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (pb.authStore.isValid) {
      setCurrentUser(pb.authStore.model);
    }
    setInitialLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setCurrentUser(model);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
    setCurrentUser(authData.record);
    return authData;
  };

  const signup = async (email, password, name, phone, role) => {
    const data = {
      email,
      password,
      passwordConfirm: password,
      name,
      phone,
      role,
      emailVisibility: true
    };
    
    const record = await pb.collection('users').create(data, { $autoCancel: false });
    
    await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
    setCurrentUser(pb.authStore.model);
    
    return record;
  };

  const logout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
    // Clear any active impersonation state on logout
    localStorage.removeItem('viewAsState');
  };

  const value = {
    currentUser,
    userRole: currentUser?.role || null,
    isAuthenticated: pb.authStore.isValid,
    login,
    signup,
    logout,
    initialLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
