import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { toast } from 'sonner';

const STORAGE_KEY = 'parentSelectedChildId';

/**
 * Fetches the children of the logged-in parent (matched by parent_contact = phone).
 * Persists and restores the selected child across page navigations via localStorage.
 * Also works when an admin is impersonating a parent via ViewAsContext.
 */
const useParentChild = () => {
  const { currentUser, userRole } = useAuth();
  const { isImpersonating, selectedRecord, selectedUserRole } = useViewAs();

  // Determine whose phone we use to find children
  const effectiveRole  = isImpersonating ? selectedUserRole : userRole;
  const effectivePhone = isImpersonating
    ? selectedRecord?.phone
    : currentUser?.phone;

  const [children, setChildren]               = useState([]);
  const [selectedChildId, setSelectedChildIdRaw] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ''
  );
  const [loading, setLoading] = useState(true);

  const setSelectedChildId = useCallback((id) => {
    setSelectedChildIdRaw(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const fetchChildren = useCallback(async () => {
    if (!effectivePhone) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await pb.collection('students').getFullList({
        filter: `parent_contact = "${effectivePhone}"`,
        expand: 'class',
        sort: 'full_name',
        $autoCancel: false,
      });
      setChildren(data);

      // Restore persisted selection or default to first child
      const persisted = localStorage.getItem(STORAGE_KEY);
      const valid = data.find((c) => c.id === persisted);
      if (valid) {
        setSelectedChildIdRaw(valid.id);
      } else if (data.length > 0) {
        setSelectedChildId(data[0].id);
      } else {
        setSelectedChildId('');
      }
    } catch (err) {
      toast.error('Failed to load children data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [effectivePhone]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  return {
    children,
    selectedChildId,
    setSelectedChildId,
    selectedChild,
    loading,
    effectiveRole,
    refetch: fetchChildren,
  };
};

export default useParentChild;
