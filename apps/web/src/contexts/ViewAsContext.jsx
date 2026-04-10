
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ViewAsContext = createContext(null);

export const useViewAs = () => {
  const context = useContext(ViewAsContext);
  if (!context) {
    throw new Error('useViewAs must be used within ViewAsProvider');
  }
  return context;
};

export const ViewAsProvider = ({ children }) => {
  const [viewAsState, setViewAsState] = useState(() => {
    const saved = localStorage.getItem('viewAsState');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectorConfig, setSelectorConfig] = useState({ isOpen: false, role: null });
  const navigate = useNavigate();

  useEffect(() => {
    if (viewAsState) {
      localStorage.setItem('viewAsState', JSON.stringify(viewAsState));
    } else {
      localStorage.removeItem('viewAsState');
    }
  }, [viewAsState]);

  const setViewAsStudent = (student) => {
    setViewAsState({
      userId: student.id,
      userRole: 'student',
      name: student.full_name,
      record: student
    });
    setSelectorConfig({ isOpen: false, role: null });
    navigate('/student-dashboard');
  };

  const setViewAsTeacher = (teacher) => {
    setViewAsState({
      userId: teacher.id,
      userRole: 'teacher',
      name: teacher.full_name,
      record: teacher
    });
    setSelectorConfig({ isOpen: false, role: null });
    navigate('/teacher-dashboard');
  };

  const setViewAsParent = (parent) => {
    setViewAsState({
      userId: parent.id,
      userRole: 'parent',
      name: parent.name,
      record: parent
    });
    setSelectorConfig({ isOpen: false, role: null });
    navigate('/parent-dashboard');
  };

  const clearViewAs = () => {
    setViewAsState(null);
    navigate('/admin-dashboard');
  };

  const openSelector = (role) => {
    setSelectorConfig({ isOpen: true, role });
  };

  const closeSelector = () => {
    setSelectorConfig({ isOpen: false, role: null });
  };

  const value = {
    viewAsState,
    selectedUserId: viewAsState?.userId || null,
    selectedUserRole: viewAsState?.userRole || null,
    selectedUserName: viewAsState?.name || null,
    selectedRecord: viewAsState?.record || null,
    isImpersonating: !!viewAsState,
    setViewAsStudent,
    setViewAsTeacher,
    setViewAsParent,
    clearViewAs,
    selectorConfig,
    openSelector,
    closeSelector
  };

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
};
