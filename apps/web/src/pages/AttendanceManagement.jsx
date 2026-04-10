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
import { ClipboardCheck, CheckCircle2, XCircle, Clock, ChevronRight, Users, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';

// ------- Status toggle button -------
const STATUS_CONFIG = {
  present: { label: 'Present', icon: CheckCircle2, classes: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' },
  late:    { label: 'Late',    icon: Clock,         classes: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200' },
  absent:  { label: 'Absent',  icon: XCircle,       classes: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' },
};
const STATUSES = ['present', 'late', 'absent'];

const StatusToggle = ({ value, onChange }) => (
  <div className="flex gap-1">
    {STATUSES.map((s) => {
      const cfg = STATUS_CONFIG[s];
      const Icon = cfg.icon;
      const active = value === s;
      return (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all ${active ? cfg.classes + ' ring-1 ring-offset-1 ring-current' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
        >
          <Icon className="h-3 w-3" />
          {cfg.label}
        </button>
      );
    })}
  </div>
);

const AttendanceManagement = () => {
  const { currentUser } = useAuth();

  const [classes, setClasses]           = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate]  = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents]          = useState([]);
  const [statusMap, setStatusMap]        = useState({});   // studentId → status
  const [existingMap, setExistingMap]    = useState({});   // studentId → attendanceRecordId
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [step, setStep]                 = useState(1); // 1 = select, 2 = mark

  // Load all classes
  useEffect(() => {
    (async () => {
      try {
        const data = await pb.collection('classes').getFullList({ sort: 'grade_level,class_name', $autoCancel: false });
        setClasses(data);
      } catch (e) {
        toast.error('Failed to load classes');
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  const loadStudentsAndAttendance = useCallback(async () => {
    if (!selectedClass || !selectedDate) return;
    setLoadingStudents(true);
    try {
      const [studentsData, attendanceData] = await Promise.all([
        pb.collection('students').getFullList({
          filter: `class = "${selectedClass}"`,
          sort: 'full_name',
          $autoCancel: false,
        }),
        pb.collection('attendance').getFullList({
          filter: `date >= "${selectedDate} 00:00:00" && date <= "${selectedDate} 23:59:59"`,
          $autoCancel: false,
        }),
      ]);

      setStudents(studentsData);

      // Build existing maps
      const existing = {};
      const statusInit = {};
      for (const rec of attendanceData) {
        existing[rec.student] = rec.id;
        statusInit[rec.student] = rec.status;
      }
      setExistingMap(existing);
      // Default any student without existing record to 'present'
      const finalStatus = {};
      for (const s of studentsData) {
        finalStatus[s.id] = statusInit[s.id] ?? 'present';
      }
      setStatusMap(finalStatus);
      setStep(2);
    } catch (e) {
      toast.error('Failed to load students');
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClass, selectedDate]);

  const handleSave = async () => {
    if (students.length === 0) return;
    setSaving(true);
    let saved = 0;
    let errors = 0;
    try {
      await Promise.all(
        students.map(async (s) => {
          const status = statusMap[s.id] ?? 'present';
          const payload = {
            student: s.id,
            date: `${selectedDate} 00:00:00.000Z`,
            status,
            marked_by: currentUser.id,
          };
          try {
            if (existingMap[s.id]) {
              await pb.collection('attendance').update(existingMap[s.id], payload, { $autoCancel: false });
            } else {
              await pb.collection('attendance').create(payload, { $autoCancel: false });
            }
            saved++;
          } catch {
            errors++;
          }
        })
      );
      if (errors === 0) {
        toast.success(`Attendance saved for ${saved} student${saved !== 1 ? 's' : ''}`);
        // Refresh existing map
        await loadStudentsAndAttendance();
      } else {
        toast.warning(`Saved ${saved}, failed ${errors}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedClassObj = classes.find((c) => c.id === selectedClass);

  const counts = Object.values(statusMap).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});

  return (
    <>
      <Helmet>
        <title>Attendance Management - Smart School Manager</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Attendance Management</h1>
          <p className="text-muted-foreground">Mark and track student attendance by class and date</p>
        </div>

        {/* Step 1 — Select class & date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Class & Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Class</Label>
                {loadingClasses ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class..." />
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
              <div className="flex-1 space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <Button
                onClick={loadStudentsAndAttendance}
                disabled={!selectedClass || !selectedDate || loadingStudents}
                className="gap-2 shrink-0"
              >
                {loadingStudents ? 'Loading...' : (<>Load Students <ChevronRight className="h-4 w-4" /></>)}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 — Mark attendance */}
        {step === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedClassObj?.class_name} — {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d yyyy')}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{students.length} students</p>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">{counts.present ?? 0} present</span>
                <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">{counts.late ?? 0} late</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">{counts.absent ?? 0} absent</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bulk actions */}
              <div className="flex gap-2 flex-wrap pb-2 border-b">
                <span className="text-xs text-muted-foreground self-center mr-1">Mark all:</span>
                {STATUSES.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const next = {};
                        for (const st of students) next[st.id] = s;
                        setStatusMap(next);
                      }}
                      className={`text-xs px-2 py-1 rounded border ${cfg.classes}`}
                    >
                      All {cfg.label}
                    </button>
                  );
                })}
              </div>

              {students.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No students found in this class.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((s, idx) => (
                    <div key={s.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{idx + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.admission_number}</p>
                        </div>
                      </div>
                      <StatusToggle
                        value={statusMap[s.id] ?? 'present'}
                        onChange={(status) => setStatusMap((prev) => ({ ...prev, [s.id]: status }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving || students.length === 0} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default AttendanceManagement;
