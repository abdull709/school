import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Award, ChevronRight, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';

const gradeLabel = (marks) => {
  if (marks >= 90) return { letter: 'A+', cls: 'bg-emerald-100 text-emerald-700' };
  if (marks >= 80) return { letter: 'A',  cls: 'bg-green-100 text-green-700' };
  if (marks >= 70) return { letter: 'B',  cls: 'bg-blue-100 text-blue-700' };
  if (marks >= 60) return { letter: 'C',  cls: 'bg-yellow-100 text-yellow-700' };
  if (marks >= 50) return { letter: 'D',  cls: 'bg-orange-100 text-orange-700' };
  return               { letter: 'F',  cls: 'bg-red-100 text-red-700' };
};

const GradeManagement = () => {
  const { currentUser } = useAuth();

  const [classes, setClasses]     = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [selectedClass, setSelectedClass]   = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm]           = useState('');

  const [students, setStudents]   = useState([]);
  const [marksMap, setMarksMap]   = useState({});   // studentId → marks (string for input)
  const [existingMap, setExistingMap] = useState({}); // studentId → gradeRecordId

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [step, setStep]           = useState(1);

  // Load classes & subjects
  useEffect(() => {
    (async () => {
      try {
        const [cls, subj] = await Promise.all([
          pb.collection('classes').getFullList({ sort: 'grade_level,class_name', $autoCancel: false }),
          pb.collection('subjects').getFullList({ sort: 'subject_name', $autoCancel: false }),
        ]);
        setClasses(cls);
        setSubjects(subj);
      } catch (e) {
        toast.error('Failed to load initial data');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const loadStudentsAndGrades = useCallback(async () => {
    if (!selectedClass || !selectedSubject || !term.trim()) return;
    setLoadingStudents(true);
    try {
      const [studentsData, gradesData] = await Promise.all([
        pb.collection('students').getFullList({
          filter: `class = "${selectedClass}"`,
          sort: 'full_name',
          $autoCancel: false,
        }),
        pb.collection('grades').getFullList({
          filter: `subject = "${selectedSubject}" && term = "${term.trim()}"`,
          $autoCancel: false,
        }),
      ]);

      setStudents(studentsData);

      const existing = {};
      const marks = {};
      for (const g of gradesData) {
        existing[g.student] = g.id;
        marks[g.student] = String(g.marks);
      }
      setExistingMap(existing);
      // Pre-fill students in this class that already have grades
      const finalMarks = {};
      for (const s of studentsData) {
        finalMarks[s.id] = marks[s.id] ?? '';
      }
      setMarksMap(finalMarks);
      setStep(2);
    } catch (e) {
      toast.error('Failed to load students/grades');
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClass, selectedSubject, term]);

  const handleSave = async () => {
    // Validate: all filled marks must be 0–100
    const invalid = students.filter((s) => {
      const v = marksMap[s.id];
      if (v === '' || v === undefined) return false; // skip blanks
      const n = Number(v);
      return isNaN(n) || n < 0 || n > 100;
    });
    if (invalid.length > 0) {
      toast.error('Marks must be between 0 and 100');
      return;
    }

    setSaving(true);
    let saved = 0;
    let skipped = 0;
    let errors = 0;

    try {
      await Promise.all(
        students.map(async (s) => {
          const raw = marksMap[s.id];
          if (raw === '' || raw === undefined) { skipped++; return; }
          const marks = Number(raw);
          const info = gradeLabel(marks);
          const payload = {
            student: s.id,
            subject: selectedSubject,
            marks,
            grade: info.letter,
            term: term.trim(),
          };
          try {
            if (existingMap[s.id]) {
              await pb.collection('grades').update(existingMap[s.id], payload, { $autoCancel: false });
            } else {
              await pb.collection('grades').create(payload, { $autoCancel: false });
            }
            saved++;
          } catch {
            errors++;
          }
        })
      );
      if (errors === 0) {
        toast.success(`Grades saved for ${saved} student${saved !== 1 ? 's' : ''}${skipped ? ` (${skipped} skipped)` : ''}`);
        await loadStudentsAndGrades();
      } else {
        toast.warning(`Saved ${saved}, failed ${errors}${skipped ? `, skipped ${skipped}` : ''}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedClassObj   = classes.find((c) => c.id === selectedClass);
  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject);

  const filledCount = students.filter((s) => marksMap[s.id] !== '' && marksMap[s.id] !== undefined).length;

  return (
    <>
      <Helmet>
        <title>Grade Management - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Grade Management</h1>
          <p className="text-muted-foreground">Enter and update student marks by class, subject, and term</p>
        </div>

        {/* Step 1 — Select filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Class, Subject & Term</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Class</Label>
                {loadingInit ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.class_name} (Grade {c.grade_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Subject</Label>
                {loadingInit ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Term</Label>
                <Input
                  placeholder="e.g. Term 1 2026"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={loadStudentsAndGrades}
                disabled={!selectedClass || !selectedSubject || !term.trim() || loadingStudents}
                className="gap-2"
              >
                {loadingStudents ? 'Loading...' : (<>Load Students <ChevronRight className="h-4 w-4" /></>)}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 — Enter marks */}
        {step === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedClassObj?.class_name} · {selectedSubjectObj?.subject_name} · {term}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {students.length} students · {filledCount} graded
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving || students.length === 0} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Grades'}
              </Button>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-muted-foreground text-center py-10">No students found in this class.</p>
              ) : (
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="grid grid-cols-[2rem_1fr_8rem_5rem] gap-4 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <span>#</span>
                    <span>Student</span>
                    <span className="text-center">Marks (0–100)</span>
                    <span className="text-center">Grade</span>
                  </div>

                  {students.map((s, idx) => {
                    const raw = marksMap[s.id] ?? '';
                    const num = raw !== '' ? Number(raw) : null;
                    const info = num !== null && !isNaN(num) ? gradeLabel(num) : null;
                    const invalid = raw !== '' && (isNaN(Number(raw)) || Number(raw) < 0 || Number(raw) > 100);

                    return (
                      <div key={s.id} className="grid grid-cols-[2rem_1fr_8rem_5rem] gap-4 items-center py-2 border-b last:border-0">
                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.admission_number}</p>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            placeholder="—"
                            value={raw}
                            onChange={(e) => setMarksMap((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            className={`h-8 text-center ${invalid ? 'border-destructive' : ''}`}
                          />
                        </div>
                        <div className="flex justify-center">
                          {info ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.cls}`}>{info.letter}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default GradeManagement;
