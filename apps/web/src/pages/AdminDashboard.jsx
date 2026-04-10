
import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCog, School, BookOpen, Plus, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    classes: 0,
    subjects: 0
  });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [studentsData, staffData, classesData, subjectsData, announcementsData] = await Promise.all([
        pb.collection('students').getList(1, 1, { $autoCancel: false }),
        pb.collection('staff').getList(1, 1, { $autoCancel: false }),
        pb.collection('classes').getList(1, 1, { $autoCancel: false }),
        pb.collection('subjects').getList(1, 1, { $autoCancel: false }),
        pb.collection('announcements').getList(1, 5, { 
          sort: '-created',
          expand: 'posted_by',
          $autoCancel: false 
        })
      ]);

      setStats({
        students: studentsData.totalItems,
        staff: staffData.totalItems,
        classes: classesData.totalItems,
        subjects: subjectsData.totalItems
      });

      setAnnouncements(announcementsData.items);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Students', value: stats.students, icon: Users, color: 'text-blue-600', link: '/students' },
    { title: 'Total Staff', value: stats.staff, icon: UserCog, color: 'text-green-600', link: '/staff' },
    { title: 'Total Classes', value: stats.classes, icon: School, color: 'text-purple-600', link: '/classes' },
    { title: 'Total Subjects', value: stats.subjects, icon: BookOpen, color: 'text-amber-600', link: '/subjects' }
  ];

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Smart School Manager</title>
        <meta name="description" content="Admin dashboard for managing school operations, students, staff, and more." />
      </Helmet>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your school management system</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Link key={index} to={stat.link}>
                  <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Announcements</CardTitle>
                <Button size="sm" asChild>
                  <Link to="/announcements">
                    <Megaphone className="h-4 w-4 mr-2" />
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border-b pb-4 last:border-0">
                      <h4 className="font-medium mb-1">{announcement.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Posted by {announcement.expand?.posted_by?.name || 'Unknown'} • {new Date(announcement.created).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No announcements yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/students">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Student
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/staff">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Staff
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/classes">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Class
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/subjects">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Subject
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
