
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardCheck, Award, Megaphone, BookOpen, TrendingUp } from 'lucide-react';
import { Helmet } from 'react-helmet';

const HomePage = () => {
  const features = [
    {
      icon: Users,
      title: 'Student management',
      description: 'Efficiently manage student records, admissions, and class assignments with comprehensive tracking tools.'
    },
    {
      icon: ClipboardCheck,
      title: 'Attendance tracking',
      description: 'Real-time attendance monitoring with automated reports and parent notifications for better accountability.'
    },
    {
      icon: Award,
      title: 'Grade management',
      description: 'Streamlined grading system with performance analytics and progress tracking across all subjects.'
    },
    {
      icon: Megaphone,
      title: 'Announcements',
      description: 'Instant communication platform to share important updates with students, parents, and staff.'
    },
    {
      icon: BookOpen,
      title: 'Subject organization',
      description: 'Organize curriculum, assign teachers, and manage subject-specific resources in one place.'
    },
    {
      icon: TrendingUp,
      title: 'Performance analytics',
      description: 'Data-driven insights into student performance, attendance patterns, and institutional metrics.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Smart School Manager - Efficient school management system</title>
        <meta name="description" content="Streamline your school operations with Smart School Manager. Manage students, track attendance, handle grades, and communicate effectively." />
      </Helmet>

      <div className="min-h-[calc(100vh-8rem)]">
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
          
          <div className="container relative px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{letterSpacing: '-0.02em'}}>
                  Modern school management made simple
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-prose">
                  Streamline your educational institution with our comprehensive platform. From student records to performance tracking, manage everything in one place.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild>
                    <Link to="/signup">Get started</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                </div>
              </div>

              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1554042317-efd62f19bc95"
                  alt="Students collaborating in a modern classroom environment"
                  className="rounded-2xl shadow-2xl w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to run your school</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to simplify administration and enhance educational outcomes
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border-2 hover:border-primary/50 transition-all duration-200">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container px-4">
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your school?</h2>
                <p className="text-lg mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
                  Join hundreds of schools already using Smart School Manager to improve their operations
                </p>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/signup">Create your account</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;
