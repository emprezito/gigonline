import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, CheckCircle } from "lucide-react";

interface CourseWithProgress {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  totalLessons: number;
  completedLessons: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) fetchEnrolledCourses();
  }, [user, authLoading]);

  const fetchEnrolledCourses = async () => {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user!.id);

    if (!enrollments?.length) {
      setLoading(false);
      return;
    }

    const courseIds = enrollments.map((e) => e.course_id);
    const { data: coursesData } = await supabase
      .from("courses")
      .select("*")
      .in("id", courseIds);

    const coursesWithProgress: CourseWithProgress[] = [];
    for (const course of coursesData || []) {
      const { data: modules } = await supabase.from("modules").select("id").eq("course_id", course.id);
      const moduleIds = modules?.map((m) => m.id) || [];
      
      let totalLessons = 0;
      let completedLessons = 0;
      
      if (moduleIds.length > 0) {
        const { count: total } = await supabase.from("lessons").select("*", { count: "exact", head: true }).in("module_id", moduleIds);
        totalLessons = total || 0;
        
        const { data: lessons } = await supabase.from("lessons").select("id").in("module_id", moduleIds);
        const lessonIds = lessons?.map((l) => l.id) || [];
        
        if (lessonIds.length > 0) {
          const { count: completed } = await supabase
            .from("lesson_progress")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .in("lesson_id", lessonIds)
            .eq("completed", true);
          completedLessons = completed || 0;
        }
      }

      coursesWithProgress.push({ ...course, totalLessons, completedLessons });
    }

    setCourses(coursesWithProgress);
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold">My Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Welcome back! Continue where you left off.</p>

        {courses.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-display text-lg font-semibold">No courses yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Enroll in a course to get started</p>
              <Button className="mt-4" onClick={() => navigate("/")}>Browse Courses</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const progress = course.totalLessons > 0 ? (course.completedLessons / course.totalLessons) * 100 : 0;
              return (
                <Card key={course.id} className="cursor-pointer transition-shadow hover:shadow-lg" onClick={() => navigate(`/course/${course.id}`)}>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {course.completedLessons}/{course.totalLessons} lessons
                        </span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Play className="h-3.5 w-3.5" />
                        Continue Learning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
