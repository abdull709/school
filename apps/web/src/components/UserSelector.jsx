
import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User } from 'lucide-react';
import { toast } from 'sonner';

const UserSelector = () => {
  const { selectorConfig, closeSelector, setViewAsStudent, setViewAsTeacher, setViewAsParent } = useViewAs();
  const { isOpen, role } = selectorConfig;
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && role) {
      fetchUsers();
    } else {
      setUsers([]);
      setSearchTerm('');
    }
  }, [isOpen, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let data = [];
      if (role === 'student') {
        const res = await pb.collection('students').getList(1, 50, { sort: 'full_name', $autoCancel: false });
        data = res.items;
      } else if (role === 'teacher') {
        const res = await pb.collection('staff').getList(1, 50, { sort: 'full_name', $autoCancel: false });
        data = res.items;
      } else if (role === 'parent') {
        const res = await pb.collection('users').getList(1, 50, { 
          filter: 'role = "parent"',
          sort: 'name',
          $autoCancel: false 
        });
        data = res.items;
      }
      setUsers(data);
    } catch (error) {
      toast.error(`Failed to load ${role}s`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    if (role === 'student') setViewAsStudent(user);
    else if (role === 'teacher') setViewAsTeacher(user);
    else if (role === 'parent') setViewAsParent(user);
  };

  const filteredUsers = users.filter(u => {
    const name = u.full_name || u.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSelector()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">Select {role} to View As</DialogTitle>
          <DialogDescription>
            Choose a {role} to impersonate and view their dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${role}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Button
                  key={user.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4 font-normal"
                  onClick={() => handleSelect(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-full">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{user.full_name || user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.admission_number || user.employee_id || user.email || 'ID: ' + user.id.slice(0,8)}
                      </p>
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No {role}s found matching your search.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSelector;
