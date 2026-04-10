
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut, GraduationCap, Bell, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Header = ({ onMenuToggle, isSidebarOpen }) => {
  const { currentUser, isAuthenticated, logout, userRole } = useAuth();
  const { isImpersonating, selectedUserName, selectedUserRole, clearViewAs } = useViewAs();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchUnreadNotifications();
      
      // Subscribe to real-time notifications
      pb.collection('notifications').subscribe('*', function (e) {
        if (e.action === 'create' && e.record.user_id === currentUser.id) {
          setUnreadCount(prev => prev + 1);
        }
      });

      return () => {
        pb.collection('notifications').unsubscribe('*');
      };
    }
  }, [isAuthenticated, currentUser]);

  const fetchUnreadNotifications = async () => {
    try {
      const result = await pb.collection('notifications').getList(1, 1, {
        filter: `user_id = "${currentUser.id}" && read = false`,
        $autoCancel: false
      });
      setUnreadCount(result.totalItems);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardRoute = () => {
    switch (userRole) {
      case 'admin': return '/admin-dashboard';
      case 'teacher': return '/teacher-dashboard';
      case 'student': return '/student-dashboard';
      case 'parent': return '/parent-dashboard';
      default: return '/';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {isImpersonating && (
        <div className="bg-primary text-primary-foreground px-4 py-1.5 flex items-center justify-between gap-4 text-sm">
          <span className="font-medium">
            Viewing as: <span className="font-bold">{selectedUserName}</span>
            <span className="ml-2 opacity-75 capitalize">({selectedUserRole})</span>
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-xs"
            onClick={clearViewAs}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Exit
          </Button>
        </div>
      )}
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl hidden sm:inline-block">Smart School Manager</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentUser?.name || currentUser?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{currentUser?.name}</p>
                      <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                      <p className="text-xs text-primary font-medium capitalize">{userRole}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getDashboardRoute())}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
