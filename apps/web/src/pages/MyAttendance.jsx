import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, parseISO } from 'date-fns';

const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

const STATUS_BADGE = { present: 'default', late: 'secondary', absent: 'destructive' };

const MyAttendance = () => {
  const { currentUser } = useAuth();
  const { isImpersonating, selectedRecord } = useViewAs();

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const studentId = isImpersonating ? selectedRecord?.id : currentUser?.id;

  const fetchAttendance = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await pb.collection('attendance').getFullList({
        filter: `student = "${studentId}"`,
        sort: '-date',
        $autoCancel: false,
      });
      setAttendance(data);
    } catch (error) {
      toast.error('Failed to load attendance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount    = attendance.filter((a) => a.status === 'late').length;
  const absentCount  = attendance.filter((a) => a.status === 'absent').length;
  const rate = pct(presentCount, attendance.length);

  const filtered = filterStatus === 'all' ? attendance : attendance.filter((a) => a.status === filterStatus);

  const formatDate = (raw) => {
    if (!raw) return '—';
    try { return format(parseISO(raw.replace(' ', 'T')), 'MMMM d, yyyy'); } catch { return raw; }
  };

  return (
    <>
      <Helmet>
        <title>My Attendance - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Attendance</h1>
          <p className="text-muted-foreground">View your attendance history and statistics</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Attendance Rate', value: loading ? '—' : (attendance.length ? `${rate}%` : 'No data'), color: rate >= 80 ? 'text-green-600' : 'text-destructive', bg: 'bg-green-500/10' },
            { label: 'Present',         value: presentCount, color: 'text-green-600', bg: 'bg-green-500/10' },
            { label: 'Late',            value: lateCount,    color: 'text-amber-600', bg: 'bg-amber-500/10' },
            { label: 'Absent',          value: absentCount,  color: 'text-destructive', bg: 'bg-destructive/10' },
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
        {!loading && attendance.length > 0 && (
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
      </div>
    </>
  );
};

export default MyAttendance;
