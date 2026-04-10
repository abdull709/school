import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import useParentChild from '@/hooks/useParentChild.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, parseISO } from 'date-fns';

const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

const STATUS_BADGE = { present: 'default', late: 'secondary', absent: 'destructive' };

const ChildAttendance = () => {
  const { children, selectedChildId, setSelectedChildId, selectedChild, loading: childrenLoading } = useParentChild();

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchAttendance = useCallback(async (childId) => {
    if (!childId) return;
    setLoading(true);
    try {
      const data = await pb.collection('attendance').getFullList({
        filter: `student = "${childId}"`,
        sort: '-date',
      });
      setAttendance(data);
    } catch (error) {
      toast.error('Failed to load attendance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAttendance([]);
    setFilterStatus('all');
    if (selectedChildId) fetchAttendance(selectedChildId);
  }, [selectedChildId, fetchAttendance]);

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount    = attendance.filter((a) => a.status === 'late').length;
  const absentCount  = attendance.filter((a) => a.status === 'absent').length;
  const rate = pct(presentCount, attendance.length);

  const filtered = filterStatus === 'all' ? attendance : attendance.filter((a) => a.status === filterStatus);

  const formatDate = (raw) => {
    if (!raw) return '—';
    try { return format(parseISO(raw.replace(' ', 'T')), 'MMMM d, yyyy'); } catch { return raw; }
  };

  const isLoading = childrenLoading || loading;

  return (
    <>
      <Helmet>
        <title>Child Attendance - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {selectedChild ? `${selectedChild.full_name}'s Attendance` : 'Child Attendance'}
            </h1>
            <p className="text-muted-foreground">View attendance history and statistics</p>
          </div>
          {children.length > 1 && (
            <Select value={selectedChildId || ''} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-48">
                <User className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {childrenLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : !selectedChild ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-center text-amber-700">
              No student linked to your account. Please contact the school administration.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Attendance Rate', value: loading ? '—' : (attendance.length ? `${rate}%` : 'No data'), color: rate >= 80 ? 'text-green-600' : 'text-destructive', bg: 'bg-green-500/10' },
                { label: 'Present',         value: loading ? '—' : presentCount, color: 'text-green-600',    bg: 'bg-green-500/10' },
                { label: 'Late',            value: loading ? '—' : lateCount,    color: 'text-amber-600',    bg: 'bg-amber-500/10' },
                { label: 'Absent',          value: loading ? '—' : absentCount,  color: 'text-destructive',  bg: 'bg-destructive/10' },
              ].map(({ label, value, color, bg }) => (
                <Card key={label}>
                  <CardContent className={`pt-6 ${bg} rounded-lg`}>
                    <p className={`text-3xl font-bold ${color}`}>{loading ? <Skeleton className="h-8 w-16" /> : value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress bars */}
            {!isLoading && attendance.length > 0 && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {[
                    { label: 'Present', count: presentCount, color: 'bg-green-500' },
                    { label: 'Late',    count: lateCount,    color: 'bg-amber-500' },
                    { label: 'Absent',  count: absentCount,  color: 'bg-destructive' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-sm w-14 text-muted-foreground">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-primary/20 overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct(count, attendance.length)}%` }} />
                      </div>
                      <span className="text-sm font-medium w-20 text-right text-muted-foreground">
                        {count} ({pct(count, attendance.length)}%)
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Filter + table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-2">
                <CardTitle className="text-base">Attendance Records</CardTitle>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                    <ClipboardCheck className="h-10 w-10 opacity-30" />
                    <p>{attendance.length === 0 ? 'No attendance records yet.' : 'No records match the selected filter.'}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filtered.map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-3">
                        <p className="text-sm font-medium">{formatDate(a.date)}</p>
                        <Badge variant={STATUS_BADGE[a.status] || 'outline'} className="capitalize">{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
};

export default ChildAttendance;
