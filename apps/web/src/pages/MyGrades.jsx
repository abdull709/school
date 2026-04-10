import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';

const avg = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

const markColor = (m) => {
  if (m >= 70) return 'text-green-600';
  if (m >= 50) return 'text-amber-600';
  return 'text-destructive';
};

const markBadge = (m) => {
  if (m >= 70) return 'default';
  if (m >= 50) return 'secondary';
  return 'destructive';
};

const MyGrades = () => {
  const { currentUser } = useAuth();
  const { isImpersonating, selectedRecord } = useViewAs();

  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const studentId = isImpersonating ? selectedRecord?.id : currentUser?.id;

  const fetchGrades = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await pb.collection('grades').getFullList({
        filter: `student = "${studentId}"`,
        expand: 'subject',
        sort: '-created',
        $autoCancel: false,
      });
      setGrades(data);
    } catch (error) {
      toast.error('Failed to load grades');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const terms = [...new Set(grades.map((g) => g.term).filter(Boolean))].sort();
  const subjects = [...new Set(grades.map((g) => g.expand?.subject?.subject_name).filter(Boolean))].sort();

  const filtered = grades.filter((g) => {
    const termMatch = filterTerm === 'all' || g.term === filterTerm;
    const subjectMatch = filterSubject === 'all' || g.expand?.subject?.subject_name === filterSubject;
    return termMatch && subjectMatch;
  });

  const avgScore = avg(filtered.map((g) => g.marks).filter((m) => m !== undefined));

  // Group by subject for the summary table
  const bySubject = {};
  filtered.forEach((g) => {
    const name = g.expand?.subject?.subject_name || 'Unknown';
    if (!bySubject[name]) bySubject[name] = [];
    bySubject[name].push(g.marks);
  });

  return (
    <>
      <Helmet>
        <title>My Grades - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Grades</h1>
            <p className="text-muted-foreground">Track your academic performance across all subjects</p>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-4 py-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Average: <span className="font-bold text-primary">{avgScore}/100</span></span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {terms.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
            <Award className="h-10 w-10 opacity-30" />
            <p>No grades recorded yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* By-subject summary */}
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Subject Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(bySubject).map(([subject, marks]) => {
                  const a = avg(marks);
                  return (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate">{subject}</span>
                        <span className={`font-semibold ${markColor(a)}`}>{a}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${a}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Full grades table */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">All Records</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y">
                  {filtered.map((grade) => (
                    <div key={grade.id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{grade.expand?.subject?.subject_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{grade.term}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {grade.grade && (
                          <span className="text-lg font-bold text-muted-foreground">{grade.grade}</span>
                        )}
                        <Badge variant={markBadge(grade.marks)}>
                          {grade.marks}/100
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default MyGrades;
