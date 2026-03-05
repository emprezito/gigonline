import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, ChevronDown, Play, FileText, Bookmark, BookmarkCheck, ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { CertificateDownload } from "@/components/CertificateDownload";

interface Module {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  type: string;
  video_url: string | null;
  description: string | null;
  resources: any;
  sort_order: number;
}

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user && courseId) fetchCourseData();
  }, [user, authLoading, courseId]);

  const fetchCourseData = async () => {
    // Fetch course title
    const { data: courseData } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId!)
      .single();
    if (courseData) setCourseTitle(courseData.title);

    const { data: modulesData } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId!)
      .order("sort_order");

    const modulesWithLessons: Module[] = [];
    for (const mod of modulesData || []) {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", mod.id)
        .order("sort_order");
      modulesWithLessons.push({ ...mod, lessons: lessons || [] });
    }

    setModules(modulesWithLessons);
    if (modulesWithLessons.length > 0 && modulesWithLessons[0].lessons.length > 0) {
      setActiveLesson(modulesWithLessons[0].lessons[0]);
    }

    // Fetch progress
    const allLessonIds = modulesWithLessons.flatMap((m) => m.lessons.map((l) => l.id));
    if (allLessonIds.length > 0) {
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user!.id)
        .in("lesson_id", allLessonIds)
        .eq("completed", true);
      setCompletedLessons(new Set(progress?.map((p) => p.lesson_id) || []));

      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("lesson_id")
        .eq("user_id", user!.id)
        .in("lesson_id", allLessonIds);
      setBookmarkedLessons(new Set(bookmarks?.map((b) => b.lesson_id) || []));
    }

    setLoading(false);
  };

  const toggleComplete = async (lessonId: string) => {
    const isCompleted = completedLessons.has(lessonId);
    if (isCompleted) {
      await supabase.from("lesson_progress").delete().eq("user_id", user!.id).eq("lesson_id", lessonId);
      setCompletedLessons((prev) => { const s = new Set(prev); s.delete(lessonId); return s; });
    } else {
      await supabase.from("lesson_progress").upsert({
        user_id: user!.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      });
      setCompletedLessons((prev) => new Set(prev).add(lessonId));
      toast({ title: "Lesson completed! 🎉" });
    }
  };

  const toggleBookmark = async (lessonId: string) => {
    const isBookmarked = bookmarkedLessons.has(lessonId);
    if (isBookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user!.id).eq("lesson_id", lessonId);
      setBookmarkedLessons((prev) => { const s = new Set(prev); s.delete(lessonId); return s; });
    } else {
      await supabase.from("bookmarks").insert({ user_id: user!.id, lesson_id: lessonId });
      setBookmarkedLessons((prev) => new Set(prev).add(lessonId));
      toast({ title: "Lesson bookmarked!" });
    }
  };

  const getEmbedUrl = (url: string | null) => {
    if (!url) return null;
    if (url.includes("youtube.com/watch")) {
      const id = new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("vimeo.com/")) {
      const id = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  };

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const overallProgress = totalLessons > 0 ? (completedLessons.size / totalLessons) * 100 : 0;

  const filteredModules = modules.map((m) => ({
    ...m,
    lessons: m.lessons.filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase())),
  })).filter((m) => m.lessons.length > 0);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex h-14 items-center gap-4 border-b bg-background px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Progress value={overallProgress} className="h-2" />
        </div>
        <span className="text-sm text-muted-foreground">{Math.round(overallProgress)}% complete</span>
        {overallProgress === 100 && totalLessons > 0 && (
          <CertificateDownload
            courseTitle={courseTitle}
            userName={user?.user_metadata?.full_name || "Student"}
            completionDate={new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          />
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 shrink-0 border-r bg-muted/30">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search lessons..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              {filteredModules.map((mod) => (
                <Collapsible key={mod.id} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50">
                    {mod.title}
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {mod.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/50 ${
                          activeLesson?.id === lesson.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {completedLessons.has(lesson.id) ? (
                          <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                        ) : lesson.type === "video" ? (
                          <Play className="h-4 w-4 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </ScrollArea>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {activeLesson ? (
            <div className="mx-auto max-w-4xl p-6">
              {activeLesson.type === "video" && activeLesson.video_url && (
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <iframe
                    src={getEmbedUrl(activeLesson.video_url) || ""}
                    className="h-full w-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}
              <div className="mt-6">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="font-display text-2xl font-bold">{activeLesson.title}</h1>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => toggleBookmark(activeLesson.id)}>
                      {bookmarkedLessons.has(activeLesson.id) ? (
                        <BookmarkCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <Bookmark className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
                {activeLesson.description && (
                  <p className="mt-4 text-muted-foreground whitespace-pre-wrap">{activeLesson.description}</p>
                )}
                {activeLesson.resources && Array.isArray(activeLesson.resources) && (activeLesson.resources as any[]).length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-display font-semibold">Resources</h3>
                    <div className="mt-2 space-y-2">
                      {(activeLesson.resources as any[]).map((r: any, i: number) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <FileText className="h-4 w-4" />
                          {r.name || `Resource ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-8">
                  <Button
                    onClick={() => toggleComplete(activeLesson.id)}
                    variant={completedLessons.has(activeLesson.id) ? "outline" : "default"}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {completedLessons.has(activeLesson.id) ? "Completed" : "Mark as Complete"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a lesson to start learning
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;
