
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Users, UserCog, School, BookOpen, Megaphone,
  ClipboardCheck, Award, FileText, Calendar, BarChart3, Eye, ArrowLeft
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { userRole } = useAuth();
  const { isImpersonating, selectedUserRole, selectedUserName, openSelector, clearViewAs } = useViewAs();
  const location = useLocation();

  const adminNavItems = [
    { path: '/admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/staff', label: 'Staff', icon: UserCog },
    { path: '/classes', label: 'Classes', icon: School },
    { path: '/subjects', label: 'Subjects', icon: BookOpen },
    { path: '/announcements-management', label: 'Announcements', icon: Megaphone },
    { path: '/calendar-management', label: 'Calendar', icon: Calendar },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const teacherNavItems = [
    { path: '/teacher-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/attendance', label: 'Attendance', icon: ClipboardCheck },
    { path: '/grades', label: 'Grades', icon: Award },
    { path: '/assignments', label: 'Assignments', icon: FileText },
  ];

  const studentNavItems = [
    { path: '/student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/my-grades', label: 'My Grades', icon: Award },
    { path: '/my-attendance', label: 'My Attendance', icon: ClipboardCheck },
    { path: '/my-assignments', label: 'My Assignments', icon: FileText },
    { path: '/student-announcements', label: 'Announcements', icon: Megaphone },
    { path: '/student-calendar', label: 'Calendar', icon: Calendar },
    { path: '/report-card', label: 'Report Card', icon: FileText },
  ];

  const parentNavItems = [
    { path: '/parent-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/child-grades', label: 'Child Grades', icon: Award },
    { path: '/child-attendance', label: 'Child Attendance', icon: ClipboardCheck },
    { path: '/child-assignments', label: 'Child Assignments', icon: FileText },
    { path: '/parent-announcements', label: 'Announcements', icon: Megaphone },
    { path: '/parent-calendar', label: 'Calendar', icon: Calendar },
    { path: '/report-card', label: 'Report Card', icon: FileText },
  ];

  const getNavItems = () => {
    if (isImpersonating) {
      switch (selectedUserRole) {
        case 'teacher': return teacherNavItems;
        case 'student': return studentNavItems;
        case 'parent': return parentNavItems;
        default: return adminNavItems;
      }
    }

    switch (userRole) {
      case 'admin': return adminNavItems;
      case 'teacher': return teacherNavItems;
      case 'student': return studentNavItems;
      case 'parent': return parentNavItems;
      default: return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      
      <aside
        className={cn(
          "fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-card border-r transition-transform duration-300 lg:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex-1 overflow-y-auto py-4">
          {isImpersonating && (
            <div className="mx-4 mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Viewing as</p>
              <p className="text-sm font-medium truncate">{selectedUserName}</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedUserRole}</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-1"
                onClick={() => { clearViewAs(); onClose(); }}
              >
                <ArrowLeft className="h-3 w-3 mr-2" />
                Back to Admin
              </Button>
            </div>
          )}
          <nav className="flex flex-col gap-2 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {userRole === 'admin' && !isImpersonating && (
            <div className="mt-8 px-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
                View As
              </h4>
              <nav className="flex flex-col gap-2">
                <button
                  onClick={() => { openSelector('student'); onClose(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 text-left"
                >
                  <Eye className="h-5 w-5" />
                  <span>Student Dashboard</span>
                </button>
                <button
                  onClick={() => { openSelector('teacher'); onClose(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 text-left"
                >
                  <Eye className="h-5 w-5" />
                  <span>Teacher Dashboard</span>
                </button>
                <button
                  onClick={() => { openSelector('parent'); onClose(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 text-left"
                >
                  <Eye className="h-5 w-5" />
                  <span>Parent Dashboard</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
