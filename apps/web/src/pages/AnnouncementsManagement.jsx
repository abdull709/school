import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';

const AnnouncementsManagement = () => {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await pb.collection('announcements').getList(1, 200, {
        expand: 'posted_by',
        sort: '-created',
        $autoCancel: false,
      });
      setAnnouncements(data.items);
    } catch (error) {
      toast.error('Failed to load announcements');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }

    setFormLoading(true);
    try {
      if (selectedAnnouncement) {
        await pb.collection('announcements').update(
          selectedAnnouncement.id,
          { title: formData.title.trim(), content: formData.content.trim() },
          { $autoCancel: false }
        );
        toast.success('Announcement updated');
      } else {
        await pb.collection('announcements').create(
          {
            title: formData.title.trim(),
            content: formData.content.trim(),
            posted_by: currentUser.id,
          },
          { $autoCancel: false }
        );
        toast.success('Announcement posted');
      }
      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({ title: announcement.title, content: announcement.content });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await pb.collection('announcements').delete(selectedAnnouncement.id, { $autoCancel: false });
      toast.success('Announcement deleted');
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setSelectedAnnouncement(null);
  };

  const filteredAnnouncements = announcements.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Announcements Management - Smart School Manager</title>
        <meta name="description" content="Create and manage school announcements." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Announcements</h1>
            <p className="text-muted-foreground">Post and manage school-wide announcements</p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                    className="text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write the announcement body here..."
                    rows={6}
                    className="text-foreground resize-none"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={formLoading}>
                  {formLoading ? 'Saving...' : selectedAnnouncement ? 'Update' : 'Post Announcement'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Megaphone className="h-10 w-10 opacity-30" />
                <p>{searchTerm ? 'No announcements match your search.' : 'No announcements yet. Post one!'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-base">{announcement.title}</h3>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {announcement.created
                              ? format(new Date(announcement.created), 'MMM d, yyyy')
                              : '—'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                        {announcement.expand?.posted_by && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Posted by {announcement.expand.posted_by.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAnnouncement(announcement);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{selectedAnnouncement?.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AnnouncementsManagement;
