import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, isPast, parseISO } from 'date-fns';

const parseDue = (raw) => { try { return parseISO(raw.replace(' ', 'T')); } catch { return null; } };

const EMPTY_FORM = { title: '', description: '', subject: '', due_date: '' };

const TeacherAssignments = () => {
  const { currentUser } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState(null); // assignment record or null
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [asgn, subj] = await Promise.all([
        pb.collection('assignments').getFullList({
          filter: `uploaded_by = "${currentUser.id}"`,
          expand: 'subject',
          sort: '-created',
          $autoCancel: false,
        }),
        pb.collection('subjects').getFullList({ sort: 'subject_name', $autoCancel: false }),
      ]);
      setAssignments(asgn);
      setSubjects(subj);
    } catch (e) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      title:       a.title,
      description: a.description ?? '',
      subject:     a.subject,
      due_date:    a.due_date ? a.due_date.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.subject)      { toast.error('Please select a subject'); return; }
    if (!form.due_date)     { toast.error('Due date is required'); return; }

    setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim(),
        subject:     form.subject,
        due_date:    `${form.due_date} 00:00:00.000Z`,
        uploaded_by: currentUser.id,
      };
      if (editing) {
        await pb.collection('assignments').update(editing.id, payload, { $autoCancel: false });
        toast.success('Assignment updated');
      } else {
        await pb.collection('assignments').create(payload, { $autoCancel: false });
        toast.success('Assignment created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      toast.error('Failed to save assignment');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await pb.collection('assignments').delete(id, { $autoCancel: false });
      toast.success('Assignment deleted');
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Failed to delete assignment');
    }
  };

  const filtered = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.expand?.subject?.subject_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Assignments - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1">Assignments</h1>
            <p className="text-muted-foreground">Manage assignments you have posted</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Post Assignment
          </Button>
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
            <p>{assignments.length === 0 ? "You haven't posted any assignments yet." : 'No results match your search.'}</p>
            {assignments.length === 0 && (
              <Button onClick={openCreate} variant="outline" className="gap-2 mt-2">
                <Plus className="h-4 w-4" /> Post your first assignment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const due = parseDue(a.due_date);
              const overdue = due && isPast(due);
              return (
                <Card key={a.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{a.title}</p>
                        <Badge variant={overdue ? 'destructive' : 'outline'} className="text-xs">
                          {due ? (overdue ? `Overdue · ${format(due, 'MMM d')}` : `Due ${format(due, 'MMM d')}`) : 'No due date'}
                        </Badge>
                        {a.expand?.subject?.subject_name && (
                          <Badge variant="secondary" className="text-xs">{a.expand.subject.subject_name}</Badge>
                        )}
                      </div>
                      {a.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{a.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete "<strong>{a.title}</strong>"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Assignment' : 'Post New Assignment'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Chapter 5 Exercises"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={form.subject} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Instructions or notes for students..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Post'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeacherAssignments;
