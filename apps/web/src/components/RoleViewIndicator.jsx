
import React from 'react';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { Button } from '@/components/ui/button';
import { Eye, XCircle } from 'lucide-react';

const RoleViewIndicator = () => {
  const { isImpersonating, selectedUserRole, selectedUserName, clearViewAs } = useViewAs();

  if (!isImpersonating) return null;

  return (
    <div className="bg-accent text-accent-foreground px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-accent-foreground/10">
      <div className="flex items-center gap-3">
        <div className="bg-background/50 p-2 rounded-full">
          <Eye className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Viewing as <span className="capitalize">{selectedUserRole}</span>
          </p>
          <p className="text-xs opacity-90">{selectedUserName}</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={clearViewAs}
        className="bg-background/50 hover:bg-background border-transparent hover:border-border"
      >
        <XCircle className="h-4 w-4 mr-2" />
        Back to Admin View
      </Button>
    </div>
  );
};

export default RoleViewIndicator;
