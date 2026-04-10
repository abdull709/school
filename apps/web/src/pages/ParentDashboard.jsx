import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import useParentChild from '@/hooks/useParentChild.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RoleViewIndicator from '@/components/RoleViewIndicator.jsx';
import { Award, ClipboardCheck, FileText, Megaphone, User, School, Calendar, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { isPast, parseISO, format } from 'date-fns';

const parseDue = (raw) => { try { return parseISO(raw.replace(' ', 'T')); } catch { return null; } };
const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

const ParentDashboard = () => {
  const { currentUser } = useAuth();
  const { isImpersonating, selectedRecord } = useViewAs();

  const {
    children, selectedChildId, setSelectedChildId, selectedChild, loading: childrenLoading,
  } = useParentChild();

  const targetUserName = isImpersonating ? selectedRecord?.name : currentUser?.name;

  const [recentGrades, setRecentGrades]   = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats]                 = useState({ avgScore: null, attendanceRate: null, pending: 0 });
  const [dataLoading, setDataLoading]     = useState(false);

  const fetchChildData = useCallback(async (childId) => {
    if (!childId) return;
    setDataLoading(true);
    try {
      const [gradesData, attendanceData, assignmentsData, annData] = await Promise.all([
        pb.collection('grades').getFullList({ filter: `student = "${childId}"`, expand: 'subject', sort: '-created' }),
        pb.collection('attendance').getFullList({ filter: `student = "${childId}"`, fields: 'status' }),
        pb.collection('assignments').getFullList({ sort: 'due_date', fields: 'id,due_date' }),
        pb.collection('announcements').getList(1, 3, { sort: '-created' }),
      ]);

      const avgScore = gradesData.length
        ? Math.round(gradesData.reduce((s, g) => s + g.marks, 0) / gradesData.length)
        : null;
      const presentCount = attendanceData.filter((a) => a.status === 'present').length;
      const attendanceRate = attendanceData.length ? pct(presentCount, attendanceData.length) : null;
      const pending = assignmentsData.filter((a) => { const due = parseDue(a.due_date); return due && !isPast(due); }).length;

      setStats({ avgScore, attendanceRate, pending });
      setRecentGrades(gradesData.slice(0, 5));
      setAnnouncements(annData.items);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load child data');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedChildId) fetchChildData(selectedChildId); }, [selectedChildId, fetchChildData]);

  const loading = childrenLoading || dataLoading;

  const gradeColor = (marks) => {
    if (marks >= 90) return 'text-green-600';
    if (marks >= 75) return 'text-blue-600';
    if (marks >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      <Helmet><title>Parent Dashboard - Smart School Manager</title></Helmet>
      <RoleViewIndicator />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {targetUserName}</p>
          </div>
          {children.length > 1 && (
            <Select value={selectedChildId || ''} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-52">
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
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : !selectedChild ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-center text-amber-700">
              No student linked to your account. Please contact the school administration.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Child info banner */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedChild.full_name}</h2>
                    <div className="flex flex-wrap gap-3 mt-1 text-blue-100 text-sm">
                      <span className="flex items-center gap-1"><School className="h-4 w-4" />{selectedChild.expand?.class?.class_name || '—'}</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />Grade {selectedChild.expand?.class?.grade_level || '—'}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Admission: {selectedChild.admission_number}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stat cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link to="/child-grades" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
                    <Award className="h-5 w-5 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-8 w-20" /> : (
                      <p className="text-2xl font-bold">{stats.avgScore !== null ? `${stats.avgScore}%` : '—'}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to="/child-attendance" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Attendance Rate</CardTitle>
                    <ClipboardCheck className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-8 w-20" /> : (
                      <p className="text-2xl font-bold">{stats.attendanceRate !== null ? `${stats.attendanceRate}%` : '—'}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to="/child-assignments" className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Upcoming Assignments</CardTitle>
                    <FileText className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-8 w-20" /> : (
                      <p className="text-2xl font-bold">{stats.pending}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Class</CardTitle>
                  <School className="h-5 w-5 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  {childrenLoading ? <Skeleton className="h-8 w-32" /> : (
                    <p className="text-xl font-bold truncate">{selectedChild.expand?.class?.class_name || '—'}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent grades + Announcements */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Grades</CardTitle>
                  <Link to="/child-grades"><Button variant="ghost" size="sm">View all</Button></Link>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : recentGrades.length === 0 ? (
                    <p className="text-gray-500 text-sm">No grades recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentGrades.map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                          <div>
                            <p className="font-medium text-sm">{g.expand?.subject?.subject_name || '—'}</p>
                            <p className="text-xs text-gray-500">{g.term}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm ${gradeColor(g.marks)}`}>{g.marks}%</p>
                            <Badge variant="outline" className="text-xs">{g.grade}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Announcements</CardTitle>
                  <Megaphone className="h-5 w-5 text-gray-400" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                  ) : announcements.length === 0 ? (
                    <p className="text-gray-500 text-sm">No announcements.</p>
                  ) : (
                    <div className="space-y-3">
                      {announcements.map((a) => (
                        <div key={a.id} className="p-3 rounded-lg border">
                          <p className="font-medium text-sm">{a.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{a.message?.slice(0, 100)}{a.message?.length > 100 ? '...' : ''}</p>
                          <p className="text-xs text-gray-400 mt-2">{format(parseISO(a.created.replace(' ', 'T')), 'MMM d, yyyy')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick links */}
            <Card>
              <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { to: '/child-grades',      icon: Award,          label: 'View Grades' },
                    { to: '/child-attendance',  icon: ClipboardCheck, label: 'View Attendance' },
                    { to: '/child-assignments', icon: FileText,       label: 'View Assignments' },
                    { to: '/report-card',       icon: BookOpen,       label: 'Report Card' },
                  ].map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to}>
                      <Button variant="outline" className="w-full flex items-center gap-2 h-12">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
};

export default ParentDashboard;
