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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
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
    if (!user) return;

    setLoading(true);
    try {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (enrollmentsError) throw enrollmentsError;
      if (!enrollments?.length) {
        setCourses([]);
        return;
      }

      const courseIds = enrollments.map((enrollment) => enrollment.course_id);

      const [{ data: coursesData, error: coursesError }, { data: modulesData, error: modulesError }] = await Promise.all([
        supabase.from("courses").select("id, title, description, image_url").in("id", courseIds),
        supabase.from("modules").select("id, course_id").in("course_id", courseIds),
      ]);

      if (coursesError) throw coursesError;
      if (modulesError) throw modulesError;

      const moduleIds = (modulesData ?? []).map((module) => module.id);
      if (!moduleIds.length) {
        setCourses((coursesData ?? []).map((course) => ({ ...course, totalLessons: 0, completedLessons: 0 })));
        return;
      }

      const [{ data: lessonsData, error: lessonsError }, { data: progressData, error: progressError }] = await Promise.all([
        supabase.from("lessons").select("id, module_id").in("module_id", moduleIds),
        supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("completed", true),
      ]);

      if (lessonsError) throw lessonsError;
      if (progressError) throw progressError;

      const moduleToCourse = new Map((modulesData ?? []).map((module) => [module.id, module.course_id]));
      const completedLessonIds = new Set((progressData ?? []).map((progress) => progress.lesson_id));
      const progressByCourse = new Map<string, { totalLessons: number; completedLessons: number }>();

      for (const lesson of lessonsData ?? []) {
        const courseId = moduleToCourse.get(lesson.module_id);
        if (!courseId) continue;

        const current = progressByCourse.get(courseId) ?? { totalLessons: 0, completedLessons: 0 };
        current.totalLessons += 1;
        if (completedLessonIds.has(lesson.id)) {
          current.completedLessons += 1;
        }
        progressByCourse.set(courseId, current);
      }

      const coursesWithProgress: CourseWithProgress[] = (coursesData ?? []).map((course) => {
        const progress = progressByCourse.get(course.id) ?? { totalLessons: 0, completedLessons: 0 };
        return { ...course, ...progress };
      });

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error("Failed to load dashboard courses:", error);
      setCourses([]);
      toast({ title: "Error", description: "We couldn't load your courses right now.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
              <Button className="mt-4" onClick={() => navigate("/#modules")}>Browse Courses</Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/course/${course.id}`);
                        }}
                      >
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
