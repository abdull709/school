
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import RoleViewIndicator from '@/components/RoleViewIndicator.jsx';
import { Users, ClipboardCheck, Award, FileText, School, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format, isPast, parseISO } from 'date-fns';

const parseDue = (raw) => { try { return parseISO(raw.replace(' ', 'T')); } catch { return null; } };

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const { isImpersonating, selectedUserId, selectedRecord } = useViewAs();

  const [stats, setStats]           = useState({ classes: 0, students: 0, assignments: 0, todayAttendance: 0 });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [classes, setClasses]       = useState([]);
  const [loading, setLoading]       = useState(true);

  const targetUserId   = isImpersonating ? selectedUserId : currentUser?.id;
  const targetUserName = isImpersonating ? selectedRecord?.full_name : currentUser?.name;

  const fetchDashboardData = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [allClasses, allStudents, assignmentsRes, todayAttendanceRes] = await Promise.all([
        pb.collection('classes').getFullList({ sort: 'class_name', $autoCancel: false }),
        pb.collection('students').getFullList({ fields: 'id', $autoCancel: false }),
        pb.collection('assignments').getList(1, 5, {
          filter: `uploaded_by = "${targetUserId}"`,
          expand: 'subject',
          sort: '-created',
          $autoCancel: false,
        }),
        pb.collection('attendance').getList(1, 1, {
          filter: `marked_by = "${targetUserId}" && date >= "${today} 00:00:00" && date <= "${today} 23:59:59"`,
          fields: 'id',
          $autoCancel: false,
        }),
      ]);

      setStats({
        classes: allClasses.length,
        students: allStudents.length,
        assignments: assignmentsRes.totalItems,
        todayAttendance: todayAttendanceRes.totalItems,
      });
      setRecentAssignments(assignmentsRes.items);
      setClasses(allClasses);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const statCards = [
    { title: 'Total Classes',       value: stats.classes,         icon: School,         color: 'text-blue-500',   link: '/attendance' },
    { title: 'Total Students',      value: stats.students,        icon: Users,          color: 'text-green-500',  link: '/grades' },
    { title: 'My Assignments',      value: stats.assignments,     icon: FileText,       color: 'text-purple-500', link: '/assignments' },
    { title: "Today's Attendance",  value: stats.todayAttendance, icon: ClipboardCheck, color: 'text-amber-500',  link: '/attendance' },
  ];

  return (
    <>
      <Helmet>
        <title>Teacher Dashboard - Smart School Manager</title>
      </Helmet>

      <RoleViewIndicator />

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {targetUserName}</p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-16" /></CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Link key={index} to={isImpersonating ? '#' : stat.link}>
                  <Card className="card-hover">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick actions */}
          {!isImpersonating && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link to="/attendance"><ClipboardCheck className="h-4 w-4 mr-2" /> Mark Attendance</Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link to="/assignments"><FileText className="h-4 w-4 mr-2" /> Post Assignment</Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link to="/grades"><Award className="h-4 w-4 mr-2" /> Enter Grades</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent assignments */}
          <Card className={isImpersonating ? 'lg:col-span-2' : ''}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Recent Assignments</CardTitle>
              {!isImpersonating && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/assignments">View All</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : recentAssignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No assignments posted yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentAssignments.map((a) => {
                    const due = parseDue(a.due_date);
                    const overdue = due && isPast(due);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{a.expand?.subject?.subject_name ?? 'General'}</p>
                          </div>
                        </div>
                        <Badge variant={overdue ? 'destructive' : 'outline'} className="shrink-0">
                          {due ? format(due, 'MMM d') : 'No date'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Classes overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><School className="h-5 w-5" /> All Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : classes.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No classes found.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cls.class_name}</p>
                      <p className="text-xs text-muted-foreground">Grade {cls.grade_level}</p>
                    </div>
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

export default TeacherDashboard;
