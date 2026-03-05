import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CourseWithProgress {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  totalLessons: number;
  completedLessons: number;
}

interface AvailableCourse {
  id: string;
  title: string;
  description: string | null;
  price: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([fetchEnrolledCourses(), fetchAvailableCourses()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    if (!user) return;
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id);

    const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id));

    const { data: allCourses } = await supabase
      .from("courses")
      .select("id, title, description, price")
      .eq("published", true);

    setAvailableCourses(
      (allCourses ?? []).filter((c) => !enrolledIds.has(c.id))
    );
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    const course = availableCourses.find((c) => c.id === courseId);
    if (!course) return;

    setEnrolling(courseId);
    try {
      // Get referral code from cookie
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
        return match ? match[2] : null;
      };
      const referralCode = getCookie("referral_code") || undefined;

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          email: user.email,
          amount: course.price,
          courseId,
          userId: user.id,
          callbackUrl: `${window.location.origin}/payment/verify`,
          referralCode,
        },
      });

      if (error) throw error;
      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Failed to initialize payment");
      }
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message, variant: "destructive" });
    } finally {
      setEnrolling(null);
    }
  };

  const fetchEnrolledCourses = async () => {
    if (!user) return;

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

        {/* Enrolled Courses */}
        {courses.length > 0 && (
          <>
            <h2 className="mt-8 font-display text-xl font-semibold">My Courses</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          </>
        )}

        {/* Available Courses */}
        {availableCourses.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-xl font-semibold">Available Courses</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableCourses.map((course) => (
                <Card key={course.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-display text-lg">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-bold">₦{course.price.toLocaleString()}</span>
                      <Button
                        size="sm"
                        className="gap-2"
                        disabled={enrolling === course.id}
                        onClick={() => handleEnroll(course.id)}
                      >
                        {enrolling === course.id ? "Processing…" : `Pay ₦${course.price.toLocaleString()}`}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {courses.length === 0 && availableCourses.length === 0 && (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-display text-lg font-semibold">No courses available</h3>
              <p className="mt-2 text-sm text-muted-foreground">Check back soon for new courses</p>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
