import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Pencil, Trash2, DollarSign, Users, BookOpen, TrendingUp, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [courseForm, setCourseForm] = useState({ title: "", description: "", price: 49999, commission_rate: 30, published: false });
  const [moduleForm, setModuleForm] = useState({ course_id: "", title: "", sort_order: 0 });
  const [lessonForm, setLessonForm] = useState({ module_id: "", title: "", type: "video", video_url: "", description: "", sort_order: 0 });
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !hasRole("admin"))) {
      navigate("/dashboard");
      return;
    }
    if (user && hasRole("admin")) fetchAllData();
  }, [user, authLoading]);

  const fetchAllData = async () => {
    const [coursesRes, affiliatesRes, salesRes, payoutsRes] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliates").select("*, profiles(full_name)"),
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("payouts").select("*, affiliates(referral_code, profiles(full_name))").order("created_at", { ascending: false }),
    ]);
    setCourses(coursesRes.data || []);
    setAffiliates(affiliatesRes.data || []);
    setSales(salesRes.data || []);
    setPayouts(payoutsRes.data || []);
    setLoading(false);
  };

  const fetchModulesForCourse = async (courseId: string) => {
    const { data } = await supabase.from("modules").select("*").eq("course_id", courseId).order("sort_order");
    setModules(data || []);
    const moduleIds = (data || []).map((m: any) => m.id);
    if (moduleIds.length > 0) {
      const { data: lessonsData } = await supabase.from("lessons").select("*").in("module_id", moduleIds).order("sort_order");
      setLessons(lessonsData || []);
    } else {
      setLessons([]);
    }
  };

  // Course CRUD
  const saveCourse = async () => {
    if (editingCourse) {
      await supabase.from("courses").update(courseForm).eq("id", editingCourse);
    } else {
      await supabase.from("courses").insert(courseForm);
    }
    setDialogOpen(null);
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", price: 49999, commission_rate: 30, published: false });
    fetchAllData();
    toast({ title: editingCourse ? "Course updated" : "Course created" });
  };

  const deleteCourse = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    fetchAllData();
    toast({ title: "Course deleted" });
  };

  // Module CRUD
  const saveModule = async () => {
    await supabase.from("modules").insert(moduleForm);
    setDialogOpen(null);
    setModuleForm({ course_id: "", title: "", sort_order: 0 });
    if (editingCourse) fetchModulesForCourse(editingCourse);
    toast({ title: "Module created" });
  };

  // Lesson CRUD
  const saveLesson = async () => {
    await supabase.from("lessons").insert(lessonForm);
    setDialogOpen(null);
    setLessonForm({ module_id: "", title: "", type: "video", video_url: "", description: "", sort_order: 0 });
    if (editingCourse) fetchModulesForCourse(editingCourse);
    toast({ title: "Lesson created" });
  };

  // Affiliate management
  const toggleAffiliate = async (id: string, field: string, value: boolean) => {
    await supabase.from("affiliates").update({ [field]: value }).eq("id", id);
    fetchAllData();
    toast({ title: "Affiliate updated" });
  };

  // Payout management
  const updatePayoutStatus = async (id: string, status: string) => {
    await supabase.from("payouts").update({ status }).eq("id", id);
    fetchAllData();
    toast({ title: `Payout ${status}` });
  };

  // Analytics data
  const salesByDay = sales.reduce((acc: any[], sale) => {
    const date = new Date(sale.created_at).toLocaleDateString();
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      existing.amount += sale.amount;
      existing.count += 1;
    } else {
      acc.push({ date, amount: sale.amount, count: 1 });
    }
    return acc;
  }, []).slice(-14);

  const totalRevenue = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.amount, 0);

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
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, icon: DollarSign },
                { label: "Total Sales", value: sales.length, icon: TrendingUp },
                { label: "Affiliates", value: affiliates.length, icon: Users },
                { label: "Courses", value: courses.length, icon: BookOpen },
              ].map((stat, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <stat.icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="font-display text-2xl font-bold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Sales Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="hsl(263, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses" className="space-y-6">
            <div className="flex justify-between">
              <h2 className="font-display text-xl font-bold">Course Management</h2>
              <Dialog open={dialogOpen === "course"} onOpenChange={(open) => { setDialogOpen(open ? "course" : null); if (!open) { setEditingCourse(null); setCourseForm({ title: "", description: "", price: 49999, commission_rate: 30, published: false }); } }}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> New Course</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">{editingCourse ? "Edit Course" : "New Course"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title</Label><Input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Price (₦)</Label><Input type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })} /></div>
                      <div><Label>Commission (%)</Label><Input type="number" value={courseForm.commission_rate} onChange={(e) => setCourseForm({ ...courseForm, commission_rate: Number(e.target.value) })} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={courseForm.published} onCheckedChange={(c) => setCourseForm({ ...courseForm, published: c })} />
                      <Label>Published</Label>
                    </div>
                    <Button onClick={saveCourse} className="w-full">Save Course</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {courses.map((course) => (
                <Card key={course.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-display font-semibold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">₦{course.price.toLocaleString()} · {course.commission_rate}% commission</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={course.published ? "default" : "secondary"}>
                        {course.published ? "Published" : "Draft"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => {
                        setCourseForm(course);
                        setEditingCourse(course.id);
                        fetchModulesForCourse(course.id);
                        setDialogOpen("course");
                      }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingCourse(course.id);
                        fetchModulesForCourse(course.id);
                        setDialogOpen("manage-course");
                      }}>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteCourse(course.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Manage Modules & Lessons Dialog */}
            <Dialog open={dialogOpen === "manage-course"} onOpenChange={(open) => setDialogOpen(open ? "manage-course" : null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Manage Modules & Lessons</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Add Module */}
                  <div className="space-y-2 rounded-lg border p-4">
                    <h4 className="font-display font-semibold">Add Module</h4>
                    <Input placeholder="Module title" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, course_id: editingCourse || "", title: e.target.value })} />
                    <Input type="number" placeholder="Sort order" value={moduleForm.sort_order} onChange={(e) => setModuleForm({ ...moduleForm, sort_order: Number(e.target.value) })} />
                    <Button size="sm" onClick={saveModule}>Add Module</Button>
                  </div>

                  {/* Modules List */}
                  {modules.map((mod) => (
                    <div key={mod.id} className="rounded-lg border p-4">
                      <h4 className="font-display font-semibold">{mod.title}</h4>
                      <div className="mt-2 space-y-2">
                        {lessons.filter((l) => l.module_id === mod.id).map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                            <span>{lesson.title}</span>
                            <Badge variant="outline">{lesson.type}</Badge>
                          </div>
                        ))}
                      </div>
                      {/* Add Lesson */}
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <Input placeholder="Lesson title" onChange={(e) => setLessonForm({ ...lessonForm, module_id: mod.id, title: e.target.value })} />
                        <Input placeholder="Video URL" onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} />
                        <Textarea placeholder="Description" onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} />
                        <Button size="sm" onClick={saveLesson}>Add Lesson</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Affiliates */}
          <TabsContent value="affiliates">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Affiliate Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((aff) => (
                      <TableRow key={aff.id}>
                        <TableCell>{(aff as any).profiles?.full_name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{aff.referral_code}</TableCell>
                        <TableCell>
                          <Switch checked={aff.approved} onCheckedChange={(v) => toggleAffiliate(aff.id, "approved", v)} />
                        </TableCell>
                        <TableCell>
                          <Switch checked={aff.enabled} onCheckedChange={(v) => toggleAffiliate(aff.id, "enabled", v)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Sales History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>₦{sale.amount.toLocaleString()}</TableCell>
                        <TableCell><Badge variant={sale.status === "completed" ? "default" : "secondary"}>{sale.status}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{sale.payment_ref || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Payout Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>{(payout as any).affiliates?.profiles?.full_name || (payout as any).affiliates?.referral_code || "—"}</TableCell>
                        <TableCell>₦{payout.amount.toLocaleString()}</TableCell>
                        <TableCell><Badge variant={payout.status === "paid" ? "default" : payout.status === "approved" ? "secondary" : "outline"}>{payout.status}</Badge></TableCell>
                        <TableCell>
                          {payout.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => updatePayoutStatus(payout.id, "approved")}>Approve</Button>
                              <Button size="sm" onClick={() => updatePayoutStatus(payout.id, "paid")}>Mark Paid</Button>
                            </div>
                          )}
                          {payout.status === "approved" && (
                            <Button size="sm" onClick={() => updatePayoutStatus(payout.id, "paid")}>Mark Paid</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
