import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, isSameDay, parseISO, startOfDay, isAfter } from 'date-fns';

const EVENT_TYPES = ['Holiday', 'Exam', 'Event', 'Other'];

const TYPE_BADGE = {
  Holiday: 'destructive',
  Exam:    'default',
  Event:   'secondary',
  Other:   'outline',
};

const TYPE_DOT = {
  Holiday: 'bg-destructive',
  Exam:    'bg-primary',
  Event:   'bg-green-500',
  Other:   'bg-muted-foreground',
};

const parseEventDate = (raw) => {
  if (!raw) return null;
  // PocketBase stores dates as "2026-04-15 00:00:00.000Z" or ISO format
  try {
    return startOfDay(parseISO(raw.replace(' ', 'T')));
  } catch {
    return startOfDay(new Date(raw));
  }
};

const CalendarManagement = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    event_name: '',
    date: '',
    description: '',
    event_type: 'Event',
  });

  const fetchEvents = useCallback(async () => {
    try {
      const data = await pb.collection('school_events').getFullList({
        sort: 'date',
        $autoCancel: false,
      });
      setEvents(data);
    } catch (error) {
      toast.error('Failed to load events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Days that have at least one event — used for calendar modifiers
  const eventDates = events.map((e) => parseEventDate(e.date)).filter(Boolean);

  // Events on the selected day
  const selectedDayEvents = events.filter((e) => {
    const d = parseEventDate(e.date);
    return d && selectedDate && isSameDay(d, selectedDate);
  });

  // Upcoming events (today onwards) for the sidebar list
  const upcomingEvents = events
    .filter((e) => {
      const d = parseEventDate(e.date);
      return d && (isSameDay(d, startOfDay(new Date())) || isAfter(d, startOfDay(new Date())));
    })
    .slice(0, 10);

  const openAddDialog = () => {
    setEditingEvent(null);
    setFormData({
      event_name: '',
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      description: '',
      event_type: 'Event',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event) => {
    setEditingEvent(event);
    setFormData({
      event_name: event.event_name,
      date: event.date ? format(parseEventDate(event.date), 'yyyy-MM-dd') : '',
      description: event.description || '',
      event_type: event.event_type || 'Event',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.event_name.trim()) { toast.error('Event name is required'); return; }
    if (!formData.date) { toast.error('Date is required'); return; }

    setFormLoading(true);
    try {
      const payload = {
        event_name: formData.event_name.trim(),
        date: formData.date,
        description: formData.description.trim(),
        event_type: formData.event_type,
        created_by: currentUser.id,
      };

      if (editingEvent) {
        await pb.collection('school_events').update(editingEvent.id, payload, { $autoCancel: false });
        toast.success('Event updated');
      } else {
        await pb.collection('school_events').create(payload, { $autoCancel: false });
        toast.success('Event created');
      }
      setDialogOpen(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await pb.collection('school_events').delete(deletingEvent.id, { $autoCancel: false });
      toast.success('Event deleted');
      setDeleteDialogOpen(false);
      setDeletingEvent(null);
      fetchEvents();
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  return (
    <>
      <Helmet>
        <title>Calendar Management - Smart School Manager</title>
        <meta name="description" content="Manage school events, exams, and holidays." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Calendar Management</h1>
            <p className="text-muted-foreground">Schedule and manage school events, exams, and holidays</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4 flex justify-center">
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  captionLayout="dropdown"
                  className="w-full [--cell-size:2.5rem]"
                  modifiers={{ hasEvent: eventDates }}
                  modifiersClassNames={{
                    hasEvent: 'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary',
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Events sidebar */}
          <div className="space-y-4">
            {/* Selected day events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No events on this day.</p>
                ) : (
                  selectedDayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => openEditDialog(event)}
                      onDelete={() => { setDeletingEvent(event); setDeleteDialogOpen(true); }}
                      showActions
                    />
                  ))
                )}
                <Button variant="outline" size="sm" className="w-full mt-1" onClick={openAddDialog}>
                  <Plus className="h-3 w-3 mr-1" /> Add event on this day
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                ) : upcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
                    <CalendarDays className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No upcoming events</p>
                  </div>
                ) : (
                  upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => openEditDialog(event)}
                      onDelete={() => { setDeletingEvent(event); setDeleteDialogOpen(true); }}
                      showActions
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingEvent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event_name">Event Name</Label>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                placeholder="e.g., End of Term Exams"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(v) => setFormData({ ...formData, event_type: v })}
              >
                <SelectTrigger id="event_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details..."
                rows={3}
                className="resize-none"
              />
            </div>
            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingEvent?.event_name}&quot;. This cannot be undone.
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

const EventCard = ({ event, onEdit, onDelete, showActions }) => {
  const d = parseEventDate(event.date);
  return (
    <div className="flex items-start gap-2 rounded-md border p-2.5 text-sm">
      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[event.event_type] || 'bg-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{event.event_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{d ? format(d, 'MMM d') : ''}</span>
          <Badge variant={TYPE_BADGE[event.event_type] || 'outline'} className="text-xs px-1.5 py-0">
            {event.event_type || 'Other'}
          </Badge>
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
        )}
      </div>
      {showActions && (
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CalendarManagement;
