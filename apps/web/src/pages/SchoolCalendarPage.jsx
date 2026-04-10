import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, isSameDay, parseISO, startOfDay, isAfter } from 'date-fns';

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
  try {
    return startOfDay(parseISO(raw.replace(' ', 'T')));
  } catch {
    return startOfDay(new Date(raw));
  }
};

const SchoolCalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchEvents = useCallback(async () => {
    try {
      const data = await pb.collection('school_events').getFullList({
        sort: 'date',
        $autoCancel: false,
      });
      setEvents(data);
    } catch (error) {
      toast.error('Failed to load calendar');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const eventDates = events.map((e) => parseEventDate(e.date)).filter(Boolean);

  const selectedDayEvents = events.filter((e) => {
    const d = parseEventDate(e.date);
    return d && selectedDate && isSameDay(d, selectedDate);
  });

  const upcomingEvents = events
    .filter((e) => {
      const d = parseEventDate(e.date);
      return d && (isSameDay(d, startOfDay(new Date())) || isAfter(d, startOfDay(new Date())));
    })
    .slice(0, 10);

  return (
    <>
      <Helmet>
        <title>School Calendar - Smart School Manager</title>
        <meta name="description" content="View upcoming school events, exams, and holidays." />
      </Helmet>

      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold mb-2">School Calendar</h1>
          <p className="text-muted-foreground">View upcoming events, exams, and holidays</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="md:col-span-2">
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

          {/* Selected day panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No events on this day.</p>
              ) : (
                selectedDayEvents.map((event) => {
                  const d = parseEventDate(event.date);
                  return (
                    <div key={event.id} className="flex items-start gap-2 rounded-md border p-2.5 text-sm">
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[event.event_type] || 'bg-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{event.event_name}</p>
                        <Badge variant={TYPE_BADGE[event.event_type] || 'outline'} className="text-xs px-1.5 py-0 mt-0.5">
                          {event.event_type || 'Other'}
                        </Badge>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming events list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                <CalendarDays className="h-10 w-10 opacity-30" />
                <p className="text-sm">No upcoming events scheduled</p>
              </div>
            ) : (
              <div className="divide-y">
                {upcomingEvents.map((event) => {
                  const d = parseEventDate(event.date);
                  return (
                    <div key={event.id} className="py-3 flex items-start gap-4">
                      {/* Date block */}
                      <div className="text-center min-w-12 shrink-0">
                        <p className="text-xs text-muted-foreground uppercase font-medium">
                          {d ? format(d, 'MMM') : ''}
                        </p>
                        <p className="text-2xl font-bold leading-tight">
                          {d ? format(d, 'd') : ''}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{event.event_name}</p>
                          <Badge variant={TYPE_BADGE[event.event_type] || 'outline'} className="text-xs">
                            {event.event_type || 'Other'}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SchoolCalendarPage;
