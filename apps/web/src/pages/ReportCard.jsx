import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useViewAs } from '@/contexts/ViewAsContext.jsx';
import useParentChild from '@/hooks/useParentChild.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { GraduationCap, User, BookOpen, Award } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const gradeInfo = (marks) => {
  if (marks >= 90) return { letter: 'A+', label: 'Outstanding', className: 'bg-emerald-100 text-emerald-800' };
  if (marks >= 80) return { letter: 'A',  label: 'Excellent',   className: 'bg-green-100 text-green-800' };
  if (marks >= 70) return { letter: 'B',  label: 'Good',        className: 'bg-blue-100 text-blue-800' };
  if (marks >= 60) return { letter: 'C',  label: 'Average',     className: 'bg-yellow-100 text-yellow-800' };
  if (marks >= 50) return { letter: 'D',  label: 'Below Avg',   className: 'bg-orange-100 text-orange-800' };
  return               { letter: 'F',  label: 'Fail',        className: 'bg-red-100 text-red-800' };
};

const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

const ReportCard = () => {
  const { currentUser, userRole } = useAuth();
  const { isImpersonating, selectedRecord, selectedUserId } = useViewAs();
  const { selectedChild } = useParentChild();

  const [student, setStudent] = useState(null);
  const [gradesByTerm, setGradesByTerm] = useState({});
  const [loading, setLoading] = useState(true);

  const studentId = isImpersonating
    ? selectedRecord?.id ?? selectedUserId
    : userRole === 'parent'
      ? selectedChild?.id
      : currentUser?.id;

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [studentRecord, grades] = await Promise.all([
        pb.collection('students').getOne(studentId, { expand: 'class', $autoCancel: false }),
        pb.collection('grades').getFullList({
          filter: `student = "${studentId}"`,
          expand: 'subject',
          sort: 'term,created',
          $autoCancel: false,
        }),
      ]);
      setStudent(studentRecord);

      const grouped = {};
      for (const g of grades) {
        const term = g.term || 'Unspecified';
        if (!grouped[term]) grouped[term] = [];
        grouped[term].push(g);
      }
      setGradesByTerm(grouped);
    } catch (error) {
      toast.error('Failed to load report card');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const terms = Object.keys(gradesByTerm).sort();

  const overallMarks = terms.flatMap((t) => gradesByTerm[t].map((g) => g.marks));
  const overallAvg = avg(overallMarks);

  return (
    <>
      <Helmet>
        <title>Report Card - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Title + Print button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Report Card</h1>
            <p className="text-muted-foreground">Academic performance overview by term</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !student ? (
          <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
            <GraduationCap className="h-10 w-10 opacity-30" />
            <p>Student record not found.</p>
          </div>
        ) : (
          <>
            {/* Student info header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 flex-1">
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-semibold">{student.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Admission No.</p>
                      <p className="font-semibold">{student.admission_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Class</p>
                      <p className="font-semibold">
                        {student.expand?.class?.class_name ?? '—'}
                        {student.expand?.class?.grade_level ? ` (Grade ${student.expand.class.grade_level})` : ''}
                      </p>
                    </div>
                    {overallMarks.length > 0 && (
                      <div className="sm:col-span-3 pt-2 border-t mt-1">
                        <p className="text-xs text-muted-foreground mb-1">Overall Average</p>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold">{overallAvg}%</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${gradeInfo(overallAvg).className}`}>
                            {gradeInfo(overallAvg).letter} — {gradeInfo(overallAvg).label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {terms.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                <BookOpen className="h-10 w-10 opacity-30" />
                <p>No grades recorded yet.</p>
              </div>
            ) : (
              terms.map((term) => {
                const records = gradesByTerm[term];
                const termMarks = records.map((g) => g.marks);
                const termAvg = avg(termMarks);
                const termHigh = Math.max(...termMarks);
                const termLow = Math.min(...termMarks);
                const passed = records.filter((g) => g.marks >= 50).length;

                return (
                  <Card key={term}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-primary" />
                          {term}
                        </CardTitle>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>Avg: <span className="font-semibold text-foreground">{termAvg}%</span></span>
                          <span>|</span>
                          <span>High: <span className="font-semibold text-foreground">{termHigh}%</span></span>
                          <span>|</span>
                          <span>Pass: <span className="font-semibold text-foreground">{passed}/{records.length}</span></span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-t border-b bg-muted/40">
                              <th className="text-left px-6 py-2 font-medium text-muted-foreground">Subject</th>
                              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Score</th>
                              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Grade</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Remark</th>
                              <th className="text-right px-6 py-2 font-medium text-muted-foreground">Bar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((g, i) => {
                              const info = gradeInfo(g.marks);
                              const subjectName = g.expand?.subject?.subject_name ?? 'Unknown';
                              return (
                                <tr key={g.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                                  <td className="px-6 py-3 font-medium">{subjectName}</td>
                                  <td className="px-4 py-3 text-center font-semibold">{g.marks}%</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.className}`}>
                                      {info.letter}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">{info.label}</td>
                                  <td className="px-6 py-3">
                                    <div className="h-2 rounded-full bg-muted overflow-hidden w-24 ml-auto">
                                      <div
                                        className={`h-full rounded-full transition-all ${g.marks >= 70 ? 'bg-green-500' : g.marks >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${g.marks}%` }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t bg-muted/30 font-semibold">
                              <td className="px-6 py-3">Term Average</td>
                              <td className="px-4 py-3 text-center">{termAvg}%</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeInfo(termAvg).className}`}>
                                  {gradeInfo(termAvg).letter}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">Highest: {termHigh}% | Lowest: {termLow}%</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ReportCard;
