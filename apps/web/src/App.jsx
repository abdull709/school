
import React, { useState } from 'react';
import { Route, Routes, BrowserRouter as Router, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { ViewAsProvider } from '@/contexts/ViewAsContext.jsx';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from '@/components/ScrollToTop.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import Header from '@/components/Header.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Footer from '@/components/Footer.jsx';
import UserSelector from '@/components/UserSelector.jsx';

// Pages
import HomePage from '@/pages/HomePage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import SignupPage from '@/pages/SignupPage.jsx';
import AdminDashboard from '@/pages/AdminDashboard.jsx';
import StudentManagement from '@/pages/StudentManagement.jsx';
import StaffManagement from '@/pages/StaffManagement.jsx';
import ClassManagement from '@/pages/ClassManagement.jsx';
import SubjectManagement from '@/pages/SubjectManagement.jsx';
import TeacherDashboard from '@/pages/TeacherDashboard.jsx';
import StudentDashboard from '@/pages/StudentDashboard.jsx';
import ParentDashboard from '@/pages/ParentDashboard.jsx';
import NotificationCenter from '@/pages/NotificationCenter.jsx';
import AnnouncementsManagement from '@/pages/AnnouncementsManagement.jsx';
import AnnouncementsPage from '@/pages/AnnouncementsPage.jsx';
import CalendarManagement from '@/pages/CalendarManagement.jsx';
import SchoolCalendarPage from '@/pages/SchoolCalendarPage.jsx';
import Analytics from '@/pages/Analytics.jsx';
import MyGrades from '@/pages/MyGrades.jsx';
import AttendanceManagement from '@/pages/AttendanceManagement.jsx';
import GradeManagement from '@/pages/GradeManagement.jsx';
import TeacherAssignments from '@/pages/TeacherAssignments.jsx';
import MyAttendance from '@/pages/MyAttendance.jsx';
import MyAssignments from '@/pages/MyAssignments.jsx';
import ReportCard from '@/pages/ReportCard.jsx';
import ChildGrades from '@/pages/ChildGrades.jsx';
import ChildAttendance from '@/pages/ChildAttendance.jsx';
import ChildAssignments from '@/pages/ChildAssignments.jsx';

// Placeholder components for unimplemented routes to prevent crashes
const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-muted-foreground">This feature is coming soon.</p>
    </div>
  </div>
);

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  
  const publicRoutes = ['/', '/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header 
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      
      <div className="flex flex-1">
        {!isPublicRoute && (
          <Sidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
        
        <main className={`flex-1 transition-all duration-300 ${!isPublicRoute ? 'lg:ml-64' : ''}`}>
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute allowedRoles={['admin']}><StudentManagement /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute allowedRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
              <Route path="/classes" element={<ProtectedRoute allowedRoles={['admin']}><ClassManagement /></ProtectedRoute>} />
              <Route path="/subjects" element={<ProtectedRoute allowedRoles={['admin']}><SubjectManagement /></ProtectedRoute>} />
              <Route path="/announcements-management" element={<ProtectedRoute allowedRoles={['admin']}><AnnouncementsManagement /></ProtectedRoute>} />
              <Route path="/calendar-management" element={<ProtectedRoute allowedRoles={['admin']}><CalendarManagement /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />

              {/* Teacher Routes */}
              <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><AttendanceManagement /></ProtectedRoute>} />
              <Route path="/grades" element={<ProtectedRoute allowedRoles={['teacher']}><GradeManagement /></ProtectedRoute>} />
              <Route path="/assignments" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAssignments /></ProtectedRoute>} />

              {/* Student Routes */}
              <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/my-grades" element={<ProtectedRoute allowedRoles={['student']}><MyGrades /></ProtectedRoute>} />
              <Route path="/my-attendance" element={<ProtectedRoute allowedRoles={['student']}><MyAttendance /></ProtectedRoute>} />
              <Route path="/my-assignments" element={<ProtectedRoute allowedRoles={['student']}><MyAssignments /></ProtectedRoute>} />
              <Route path="/student-announcements" element={<ProtectedRoute allowedRoles={['student']}><AnnouncementsPage /></ProtectedRoute>} />
              <Route path="/student-calendar" element={<ProtectedRoute allowedRoles={['student']}><SchoolCalendarPage /></ProtectedRoute>} />

              {/* Parent Routes */}
              <Route path="/parent-dashboard" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
              <Route path="/child-grades" element={<ProtectedRoute allowedRoles={['parent']}><ChildGrades /></ProtectedRoute>} />
              <Route path="/child-attendance" element={<ProtectedRoute allowedRoles={['parent']}><ChildAttendance /></ProtectedRoute>} />
              <Route path="/child-assignments" element={<ProtectedRoute allowedRoles={['parent']}><ChildAssignments /></ProtectedRoute>} />
              <Route path="/parent-announcements" element={<ProtectedRoute allowedRoles={['parent']}><AnnouncementsPage /></ProtectedRoute>} />
              <Route path="/parent-calendar" element={<ProtectedRoute allowedRoles={['parent']}><SchoolCalendarPage /></ProtectedRoute>} />

              {/* Shared Routes */}
              <Route path="/report-card" element={<ProtectedRoute allowedRoles={['student', 'parent']}><ReportCard /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />

              {/* Catch all */}
              <Route path="*" element={<PlaceholderPage title="404 - Page Not Found" />} />
            </Routes>
          </div>
        </main>
      </div>
      
      <UserSelector />
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ViewAsProvider>
          <ScrollToTop />
          <AppContent />
        </ViewAsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
