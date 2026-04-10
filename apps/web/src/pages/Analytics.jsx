import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users, UserCog, School, BookOpen,
  TrendingUp, ClipboardCheck, Star, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';

// ─── palette ─────────────────────────────────────────────
const COLORS = {
  present: '#22c55e',
  late:    '#f59e0b',
  absent:  '#ef4444',
  primary: 'hsl(var(--primary))',
  chart: ['hsl(var(--primary))', '#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'],
};

// ─── helpers ─────────────────────────────────────────────
const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

const StatCard = ({ title, value, icon: Icon, color, sub, loading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </>
      )}
    </CardContent>
  </Card>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-xl font-semibold mt-8 mb-4">{children}</h2>
);

// ─── main ─────────────────────────────────────────────────
const Analytics = () => {
  const [loading, setLoading] = useState(true);

  // counts
  const [counts, setCounts] = useState({ students: 0, staff: 0, classes: 0, subjects: 0 });

  // attendance
  const [attendanceRaw, setAttendanceRaw] = useState([]);
  const [attendanceByClass, setAttendanceByClass] = useState([]);
  const [attendancePie, setAttendancePie] = useState([]);

  // grades
  const [gradesRaw, setGradesRaw] = useState([]);
  const [gradesBySubject, setGradesBySubject] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [terms, setTerms] = useState([]);

  // classes
  const [classesList, setClassesList] = useState([]);

  // ── fetch ──────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        studentsRes, staffRes, classesRes, subjectsRes,
        attendanceRes, gradesRes,
      ] = await Promise.all([
        pb.collection('students').getList(1, 1, { $autoCancel: false }),
        pb.collection('staff').getList(1, 1, { $autoCancel: false }),
        pb.collection('classes').getFullList({ $autoCancel: false }),
        pb.collection('subjects').getList(1, 1, { $autoCancel: false }),
        pb.collection('attendance').getFullList({
          expand: 'student.class',
          $autoCancel: false,
        }),
        pb.collection('grades').getFullList({
          expand: 'subject',
          $autoCancel: false,
        }),
      ]);

      setCounts({
        students: studentsRes.totalItems,
        staff: staffRes.totalItems,
        classes: classesRes.length,
        subjects: subjectsRes.totalItems,
      });

      setClassesList(classesRes);
      setAttendanceRaw(attendanceRes);
      setGradesRaw(gradesRes);

      // ── attendance pie ─────────────────────────────────
      const attCounts = { present: 0, late: 0, absent: 0 };
      attendanceRes.forEach((r) => { if (attCounts[r.status] !== undefined) attCounts[r.status]++; });
      setAttendancePie([
        { name: 'Present', value: attCounts.present, color: COLORS.present },
        { name: 'Late',    value: attCounts.late,    color: COLORS.late    },
        { name: 'Absent',  value: attCounts.absent,  color: COLORS.absent  },
      ]);

      // ── attendance by class ────────────────────────────
      const classMap = {};
      classesRes.forEach((c) => { classMap[c.id] = c.class_name; });
      const byClass = {};
      attendanceRes.forEach((r) => {
        const classId = r.expand?.student?.class;
        if (!classId) return;
        const className = classMap[classId] || classId;
        if (!byClass[className]) byClass[className] = { present: 0, late: 0, absent: 0, total: 0 };
        if (byClass[className][r.status] !== undefined) byClass[className][r.status]++;
        byClass[className].total++;
      });
      setAttendanceByClass(
        Object.entries(byClass)
          .map(([name, d]) => ({
            name,
            Present: d.present,
            Late:    d.late,
            Absent:  d.absent,
            rate:    pct(d.present, d.total),
          }))
          .sort((a, b) => b.rate - a.rate)
      );

      // ── terms ─────────────────────────────────────────
      const termSet = [...new Set(gradesRes.map((g) => g.term).filter(Boolean))].sort();
      setTerms(termSet);

      // ── grades by subject ──────────────────────────────
      buildGradesBySubject(gradesRes, 'all');
      buildGradeDistribution(gradesRes, 'all');
    } catch (err) {
      toast.error('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── recompute grades when term filter changes ──────────
  useEffect(() => {
    if (gradesRaw.length === 0) return;
    buildGradesBySubject(gradesRaw, selectedTerm);
    buildGradeDistribution(gradesRaw, selectedTerm);
  }, [selectedTerm, gradesRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildGradesBySubject = (grades, term) => {
    const filtered = term === 'all' ? grades : grades.filter((g) => g.term === term);
    const subjectMap = {};
    filtered.forEach((g) => {
      const name = g.expand?.subject?.subject_name || 'Unknown';
      if (!subjectMap[name]) subjectMap[name] = [];
      subjectMap[name].push(g.marks);
    });
    setGradesBySubject(
      Object.entries(subjectMap)
        .map(([name, marks]) => ({ name, avg: Math.round(avg(marks)) }))
        .sort((a, b) => b.avg - a.avg)
    );
  };

  const buildGradeDistribution = (grades, term) => {
    const filtered = term === 'all' ? grades : grades.filter((g) => g.term === term);
    const buckets = { '0–49': 0, '50–59': 0, '60–69': 0, '70–79': 0, '80–89': 0, '90–100': 0 };
    filtered.forEach(({ marks }) => {
      if (marks < 50)       buckets['0–49']++;
      else if (marks < 60)  buckets['50–59']++;
      else if (marks < 70)  buckets['60–69']++;
      else if (marks < 80)  buckets['70–79']++;
      else if (marks < 90)  buckets['80–89']++;
      else                  buckets['90–100']++;
    });
    setGradeDistribution(Object.entries(buckets).map(([range, count]) => ({ range, count })));
  };

  // ── derived ────────────────────────────────────────────
  const totalAtt = attendancePie.reduce((s, p) => s + p.value, 0);
  const overallAttRate = pct(attendancePie.find((p) => p.name === 'Present')?.value ?? 0, totalAtt);

  const filteredGrades = selectedTerm === 'all' ? gradesRaw : gradesRaw.filter((g) => g.term === selectedTerm);
  const avgScore = Math.round(avg(filteredGrades.map((g) => g.marks).filter((m) => m !== undefined)));

  const topStudents = (() => {
    const byStudent = {};
    filteredGrades.forEach((g) => {
      if (!byStudent[g.student]) byStudent[g.student] = { marks: [], name: g.student };
      byStudent[g.student].marks.push(g.marks);
    });
    return Object.values(byStudent)
      .map((s) => ({ id: s.name, avg: Math.round(avg(s.marks)) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  })();

  // ── render ─────────────────────────────────────────────
  return (
    <>
      <Helmet>
        <title>Analytics - Smart School Manager</title>
        <meta name="description" content="School analytics — attendance, grades, and performance overview." />
      </Helmet>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">School-wide performance and attendance insights</p>

        {/* ── Overview stats ──────────────────────────── */}
        <SectionTitle>Overview</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Students"   value={counts.students} icon={Users}          color="text-blue-500"   loading={loading} />
          <StatCard title="Total Staff"      value={counts.staff}    icon={UserCog}         color="text-green-500"  loading={loading} />
          <StatCard title="Total Classes"    value={counts.classes}  icon={School}          color="text-purple-500" loading={loading} />
          <StatCard title="Total Subjects"   value={counts.subjects} icon={BookOpen}        color="text-amber-500"  loading={loading} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          <StatCard
            title="Overall Attendance Rate"
            value={loading ? '—' : `${overallAttRate}%`}
            icon={ClipboardCheck}
            color={overallAttRate >= 80 ? 'text-green-500' : 'text-destructive'}
            sub={`${totalAtt} records total`}
            loading={loading}
          />
          <StatCard
            title="Average Score"
            value={loading ? '—' : (filteredGrades.length ? `${avgScore}/100` : 'No data')}
            icon={Star}
            color="text-amber-500"
            sub={`${filteredGrades.length} grade records`}
            loading={loading}
          />
          <StatCard
            title="Absent Records"
            value={loading ? '—' : (attendancePie.find((p) => p.name === 'Absent')?.value ?? 0)}
            icon={AlertCircle}
            color="text-destructive"
            sub={`${pct(attendancePie.find((p) => p.name === 'Absent')?.value ?? 0, totalAtt)}% of total`}
            loading={loading}
          />
        </div>

        {/* ── Attendance ──────────────────────────────── */}
        <SectionTitle>Attendance</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pie */}
          <Card>
            <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-52 w-full" /> : totalAtt === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={attendancePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {attendancePie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Records']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-center gap-4 mt-2">
                {attendancePie.map((p) => (
                  <div key={p.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By class bar */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Attendance by Class</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-52 w-full" /> : attendanceByClass.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={attendanceByClass} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Present" stackId="a" fill={COLORS.present} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Late"    stackId="a" fill={COLORS.late}    />
                    <Bar dataKey="Absent"  stackId="a" fill={COLORS.absent}  radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Grades ──────────────────────────────────── */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-xl font-semibold">Grades &amp; Performance</h2>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {terms.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Average by subject */}
          <Card>
            <CardHeader><CardTitle className="text-base">Average Score by Subject</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-52 w-full" /> : gradesBySubject.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={gradesBySubject} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v) => [`${v}/100`, 'Avg Score']} />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Grade distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Score Distribution</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-52 w-full" /> : filteredGrades.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={gradeDistribution} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'Students']} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top performing students */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top Performing Students
              {selectedTerm !== 'all' && <Badge variant="secondary">{selectedTerm}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : topStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No grade data available.</p>
            ) : (
              <div className="space-y-2">
                {topStudents.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                      <div
                        className="h-full bg-primary/20 rounded-full transition-all"
                        style={{ width: `${s.avg}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                        Student ID: {s.id.slice(0, 8)}…
                      </span>
                    </div>
                    <span className="text-sm font-semibold w-14 text-right">{s.avg}/100</span>
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

const EmptyChart = () => (
  <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
    No data available yet
  </div>
);

export default Analytics;
