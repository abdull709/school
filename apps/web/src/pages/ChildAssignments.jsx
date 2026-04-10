import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import useParentChild from '@/hooks/useParentChild.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';

const parseDue = (raw) => {
  if (!raw) return null;
  try { return parseISO(raw.replace(' ', 'T')); } catch { return null; }
};

const dueBadge = (due) => {
  if (!due) return { label: 'No due date', variant: 'outline' };
  if (isPast(due)) return { label: 'Overdue', variant: 'destructive' };
  const days = differenceInDays(due, new Date());
  if (days <= 3) return { label: `Due in ${days}d`, variant: 'secondary' };
  return { label: format(due, 'MMM d'), variant: 'outline' };
};

const ChildAssignments = () => {
  const { selectedChild, loading: childrenLoading } = useParentChild();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pb.collection('assignments').getFullList({
        expand: 'subject',
        sort: 'due_date',
      });
      setAssignments(data);
    } catch (error) {
      toast.error('Failed to load assignments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const filtered = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.expand?.subject?.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcoming = filtered.filter((a) => !isPast(parseDue(a.due_date) || new Date(0)));
  const overdue  = filtered.filter((a) => { const d = parseDue(a.due_date); return d && isPast(d); });

  const Section = ({ title, items }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title} ({items.length})</h3>
      {items.map((a) => {
        const due = parseDue(a.due_date);
        const badge = dueBadge(due);
        return (
          <Card
            key={a.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelected(a)}
          >
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {a.expand?.subject?.subject_name || 'General'}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {due && <p className="text-xs text-muted-foreground">{format(due, 'EEE, MMM d yyyy')}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Child Assignments - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold mb-2">Assignments</h1>
            {selectedChild && !childrenLoading && (
              <p className="text-muted-foreground flex items-center gap-1">
                <User className="h-4 w-4" />
                For: <span className="font-medium text-foreground ml-1">{selectedChild.full_name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-30" />
            <p>{assignments.length === 0 ? 'No assignments yet.' : 'No results match your search.'}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {overdue.length > 0 && <Section title="Overdue" items={overdue} />}
            {upcoming.length > 0 && <Section title="Upcoming" items={upcoming} />}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (() => {
          const due = parseDue(selected.due_date);
          const badge = dueBadge(due);
          return (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  {selected.expand?.subject?.subject_name && (
                    <Badge variant="outline">{selected.expand.subject.subject_name}</Badge>
                  )}
                </div>
                {due && (
                  <p className="text-sm text-muted-foreground">
                    Due: <span className="font-medium text-foreground">{format(due, 'EEEE, MMMM d, yyyy')}</span>
                  </p>
                )}
                {selected.description ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided.</p>
                )}
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </>
  );
};

export default ChildAssignments;
