
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import RoleViewIndicator from '@/components/RoleViewIndicator.jsx';
import { Award, ClipboardCheck, FileText, Megaphone, School, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, isPast, parseISO } from 'date-fns';

const AttBar = ({ value, color }) => (
  <div className="flex-1 h-2 rounded-full bg-primary/20 overflow-hidden">
    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
  </div>
);

const avg = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

const StatCard = ({ title, value, icon: Icon, color, sub, loading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      {loading ? <Skeleton className="h-8 w-24" /> : (
        <>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </>
      )}
    </CardContent>
  </Card>
);

const STATUS_BADGE = { present: 'default', late: 'secondary', absent: 'destructive' };

const StudentDashboard = () => {
  const { currentUser } = useAuth();
  const { isImpersonating, selectedUserId, selectedRecord } = useViewAs();

  const [studentData, setStudentData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      let student = null;
      if (isImpersonating && selectedRecord) {
        // Admin impersonating: selectedRecord is from students collection
        student = selectedRecord;
        // Fetch class expansion if missing
        if (!student.expand?.class && student.class) {
          try {
            student = await pb.collection('students').getOne(student.id, { expand: 'class', $autoCancel: false });
          } catch (_) { /* keep as-is */ }
        }
      } else if (currentUser) {
        // Student's users.id === students.id (enforced by attendance rule & schema convention)
        try {
          student = await pb.collection('students').getOne(currentUser.id, { expand: 'class', $autoCancel: false });
        } catch (_) {
          // fallback: search by name
          const res = await pb.collection('students').getList(1, 1, {
            filter: `full_name ~ "${currentUser.name}"`,
            expand: 'class',
            $autoCancel: false,
          });
          student = res.items[0] || null;
        }
      }

      setStudentData(student);

      const studentId = student?.id;
      const [gradesData, attendanceData, assignmentsData, announcementsData] = await Promise.all([
        studentId
          ? pb.collection('grades').getFullList({ filter: `student = "${studentId}"`, expand: 'subject', sort: '-created', $autoCancel: false })
          : Promise.resolve([]),
        studentId
          ? pb.collection('attendance').getFullList({ filter: `student = "${studentId}"`, sort: '-date', $autoCancel: false })
          : Promise.resolve([]),
        pb.collection('assignments').getList(1, 5, { expand: 'subject', sort: 'due_date', $autoCancel: false }),
        pb.collection('announcements').getList(1, 3, { sort: '-created', $autoCancel: false }),
      ]);

      setGrades(gradesData);
      setAttendance(attendanceData);
      setUpcomingAssignments(assignmentsData.items);
      setAnnouncements(announcementsData.items);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isImpersonating, selectedRecord, selectedUserId]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // Derived stats
  const avgScore = avg(grades.map((g) => g.marks).filter((m) => m !== undefined));
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const attendanceRate = pct(presentCount, attendance.length);
  const pendingCount = upcomingAssignments.filter((a) => {
    if (!a.due_date) return false;
    try { return !isPast(parseISO(a.due_date.replace(' ', 'T'))); } catch { return false; }
  }).length;
  const recentGrades = grades.slice(0, 5);
  const recentAttendance = attendance.slice(0, 5);

  return (
    <>
      <Helmet>
        <title>Student Dashboard - Smart School Manager</title>
      </Helmet>

      <RoleViewIndicator />

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {isImpersonating ? studentData?.full_name : currentUser?.name}
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Current Class"
            value={loading ? '—' : (studentData?.expand?.class?.class_name || 'N/A')}
            icon={School}
            color="text-blue-500"
            sub={studentData?.admission_number ? `Adm: ${studentData.admission_number}` : undefined}
            loading={loading}
          />
          <StatCard
            title="Average Score"
            value={loading ? '—' : (grades.length ? `${avgScore}/100` : 'No data')}
            icon={Award}
            color="text-green-500"
            sub={`${grades.length} grade records`}
            loading={loading}
          />
          <StatCard
            title="Attendance Rate"
            value={loading ? '—' : (attendance.length ? `${attendanceRate}%` : 'No data')}
            icon={ClipboardCheck}
            color={attendanceRate >= 80 ? 'text-amber-500' : 'text-destructive'}
            sub={`${attendance.length} total records`}
            loading={loading}
          />
          <StatCard
            title="Upcoming Assignments"
            value={loading ? '—' : pendingCount}
            icon={FileText}
            color="text-purple-500"
            sub="due in the future"
            loading={loading}
          />
        </div>

        {/* ── Attendance progress ── */}
        {!loading && attendance.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Attendance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Present', count: attendance.filter((a) => a.status === 'present').length, color: 'bg-green-500' },
                { label: 'Late',    count: attendance.filter((a) => a.status === 'late').length,    color: 'bg-amber-500' },
                { label: 'Absent',  count: attendance.filter((a) => a.status === 'absent').length,  color: 'bg-destructive' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm w-14 text-muted-foreground">{label}</span>
                  <AttBar value={pct(count, attendance.length)} color={color} />
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Recent Grades ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Grades</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/my-grades">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : recentGrades.length > 0 ? (
                <div className="divide-y">
                  {recentGrades.map((grade) => (
                    <div key={grade.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{grade.expand?.subject?.subject_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{grade.term}</p>
                      </div>
                      <div className="text-right">
                        {grade.grade && <p className="font-bold text-lg leading-none">{grade.grade}</p>}
                        <p className={`text-sm font-semibold ${grade.marks >= 70 ? 'text-green-600' : grade.marks >= 50 ? 'text-amber-600' : 'text-destructive'}`}>
                          {grade.marks}/100
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">No grades recorded yet</p>
              )}
            </CardContent>
          </Card>

          {/* ── Recent Attendance ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Attendance</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/my-attendance">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : recentAttendance.length > 0 ? (
                <div className="divide-y">
                  {recentAttendance.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2.5">
                      <p className="text-sm">{a.date ? format(new Date(a.date), 'MMM d, yyyy') : '—'}</p>
                      <Badge variant={STATUS_BADGE[a.status] || 'outline'} className="capitalize">{a.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">No attendance records yet</p>
              )}
            </CardContent>
          </Card>

          {/* ── Upcoming Assignments ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assignments</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/my-assignments">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : upcomingAssignments.length > 0 ? (
                <div className="divide-y">
                  {upcomingAssignments.map((a) => {
                    let dueParsed = null;
                    try { dueParsed = a.due_date ? parseISO(a.due_date.replace(' ', 'T')) : null; } catch (_) {}
                    const overdue = dueParsed && isPast(dueParsed);
                    return (
                      <div key={a.id} className="flex items-start justify-between py-3 gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.expand?.subject?.subject_name || 'General'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant={overdue ? 'destructive' : 'secondary'} className="text-xs">
                            {dueParsed ? format(dueParsed, 'MMM d') : 'No due date'}
                          </Badge>
                          {overdue && <p className="text-xs text-destructive mt-0.5">Overdue</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">No assignments</p>
              )}
            </CardContent>
          </Card>

          {/* ── Announcements ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student-announcements">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : announcements.length > 0 ? (
                <div className="divide-y">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{ann.title}</p>
                        <Megaphone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{ann.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">No announcements</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default StudentDashboard;

