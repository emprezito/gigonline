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
import { Plus, Pencil, Trash2, DollarSign, Users, BookOpen, TrendingUp, ArrowUpDown, Loader2, CheckCircle, XCircle, Settings } from "lucide-react";
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
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  const [minWithdrawal, setMinWithdrawal] = useState("20000");
  const [savingSettings, setSavingSettings] = useState(false);

  // Form states
  const [courseForm, setCourseForm] = useState({ title: "", description: "", price: 49999, commission_rate: 50, published: false });
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
    const [coursesRes, affiliatesRes, salesRes, payoutsRes, settingsRes] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliates").select("*"),
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("payouts").select("*, affiliates(referral_code, account_name, bank_name, account_number)").order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("*").eq("key", "min_withdrawal").single(),
    ]);

    if (settingsRes.data?.value) setMinWithdrawal(settingsRes.data.value);

    const affData = affiliatesRes.data || [];
    if (affData.length > 0) {
      const userIds = affData.map((a: any) => a.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]));
      affData.forEach((a: any) => { a.profile_name = profileMap[a.user_id] || "—"; });
    }

    const payoutsData = payoutsRes.data || [];
    if (payoutsData.length > 0 && affData.length > 0) {
      const affMap = Object.fromEntries(affData.map((a: any) => [a.id, a.profile_name]));
      payoutsData.forEach((p: any) => {
        p.affiliate_name = affMap[p.affiliate_id] || (p as any).affiliates?.referral_code || "—";
      });
    }

    setCourses(coursesRes.data || []);
    setAffiliates(affData);
    setSales(salesRes.data || []);
    setPayouts(payoutsData);
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

  const saveCourse = async () => {
    if (editingCourse) {
      await supabase.from("courses").update(courseForm).eq("id", editingCourse);
    } else {
      await supabase.from("courses").insert(courseForm);
    }
    setDialogOpen(null);
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", price: 49999, commission_rate: 50, published: false });
    fetchAllData();
    toast({ title: editingCourse ? "Course updated" : "Course created" });
  };

  const deleteCourse = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    fetchAllData();
    toast({ title: "Course deleted" });
  };

  const saveModule = async () => {
    await supabase.from("modules").insert(moduleForm);
    setDialogOpen(null);
    setModuleForm({ course_id: "", title: "", sort_order: 0 });
    if (editingCourse) fetchModulesForCourse(editingCourse);
    toast({ title: "Module created" });
  };

  const saveLesson = async () => {
    await supabase.from("lessons").insert(lessonForm);
    setDialogOpen(null);
    setLessonForm({ module_id: "", title: "", type: "video", video_url: "", description: "", sort_order: 0 });
    if (editingCourse) fetchModulesForCourse(editingCourse);
    toast({ title: "Lesson created" });
  };

  const toggleAffiliate = async (id: string, field: string, value: boolean) => {
    await supabase.from("affiliates").update({ [field]: value }).eq("id", id);
    fetchAllData();
    toast({ title: "Affiliate updated" });
  };

  const approvePayout = async (payoutId: string) => {
    setProcessingPayoutId(payoutId);
    try {
      const { data: updatedPayout, error } = await supabase
        .from("payouts")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", payoutId)
        .select("id, status, approved_at")
        .single();

      if (error) throw error;

      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, ...updatedPayout } : p)));
      toast({ title: "Payout approved", description: "Transfer the funds manually, then mark as paid." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const markPayoutCompleted = async (payoutId: string) => {
    setProcessingPayoutId(payoutId);
    try {
      const { data: updatedPayout, error } = await supabase
        .from("payouts")
        .update({ status: "paid", completed_at: new Date().toISOString() })
        .eq("id", payoutId)
        .select("id, status, completed_at")
        .single();

      if (error) throw error;

      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, ...updatedPayout } : p)));
      toast({ title: "Payout marked as paid" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const rejectPayout = async (payoutId: string) => {
    try {
      const { data: updatedPayout, error } = await supabase
        .from("payouts")
        .update({ status: "failed" })
        .eq("id", payoutId)
        .select("id, status")
        .single();

      if (error) throw error;

      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, ...updatedPayout } : p)));
      toast({ title: "Payout rejected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const saveMinWithdrawal = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: minWithdrawal, updated_at: new Date().toISOString() })
        .eq("key", "min_withdrawal");
      if (error) throw error;
      toast({ title: "Settings saved", description: `Minimum withdrawal set to ₦${Number(minWithdrawal).toLocaleString()}` });
    } catch (err: any) {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const salesByDay = sales.reduce((acc: any[], sale) => {
    const date = new Date(sale.created_at).toLocaleDateString();
    const existing = acc.find((d) => d.date === date);
    if (existing) { existing.amount += sale.amount; existing.count += 1; }
    else { acc.push({ date, amount: sale.amount, count: 1 }); }
    return acc;
  }, []).slice(-14);

  const totalRevenue = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.amount, 0);
  const pendingPayoutsCount = payouts.filter((p) => p.status === "pending").length;
  const completedPayoutsTotal = payouts.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);

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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="payouts" className="relative">
              Payouts
              {pendingPayoutsCount > 0 && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {pendingPayoutsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, icon: DollarSign },
                { label: "Total Sales", value: sales.length, icon: TrendingUp },
                { label: "Affiliates", value: affiliates.length, icon: Users },
                { label: "Total Payouts", value: `₦${completedPayoutsTotal.toLocaleString()}`, icon: DollarSign },
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
              <CardHeader><CardTitle className="font-display">Sales Over Time</CardTitle></CardHeader>
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
              <Dialog open={dialogOpen === "course"} onOpenChange={(open) => { setDialogOpen(open ? "course" : null); if (!open) { setEditingCourse(null); setCourseForm({ title: "", description: "", price: 49999, commission_rate: 50, published: false }); } }}>
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
                      <Badge variant={course.published ? "default" : "secondary"}>{course.published ? "Published" : "Draft"}</Badge>
                      <Button variant="outline" size="sm" onClick={() => { setCourseForm(course); setEditingCourse(course.id); fetchModulesForCourse(course.id); setDialogOpen("course"); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditingCourse(course.id); fetchModulesForCourse(course.id); setDialogOpen("manage-course"); }}><ArrowUpDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteCourse(course.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={dialogOpen === "manage-course"} onOpenChange={(open) => setDialogOpen(open ? "manage-course" : null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Manage Modules & Lessons</DialogTitle></DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2 rounded-lg border p-4">
                    <h4 className="font-display font-semibold">Add Module</h4>
                    <Input placeholder="Module title" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, course_id: editingCourse || "", title: e.target.value })} />
                    <Input type="number" placeholder="Sort order" value={moduleForm.sort_order} onChange={(e) => setModuleForm({ ...moduleForm, sort_order: Number(e.target.value) })} />
                    <Button size="sm" onClick={saveModule}>Add Module</Button>
                  </div>
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
              <CardHeader><CardTitle className="font-display">Affiliate Management</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((aff) => (
                      <TableRow key={aff.id}>
                        <TableCell>{aff.profile_name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{aff.referral_code}</TableCell>
                        <TableCell className="text-sm">{aff.bank_name ? `${aff.bank_name} - ${aff.account_number}` : "Not set"}</TableCell>
                        <TableCell><Switch checked={aff.approved} onCheckedChange={(v) => toggleAffiliate(aff.id, "approved", v)} /></TableCell>
                        <TableCell><Switch checked={aff.enabled} onCheckedChange={(v) => toggleAffiliate(aff.id, "enabled", v)} /></TableCell>
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
              <CardHeader><CardTitle className="font-display">Sales History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>₦{sale.amount.toLocaleString()}</TableCell>
                        <TableCell>₦{(sale.commission_amount || 0).toLocaleString()}</TableCell>
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
          <TabsContent value="payouts" className="space-y-6">
            {/* Payout Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="font-display text-2xl font-bold">{pendingPayoutsCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total Paid Out</p>
                  <p className="font-display text-2xl font-bold">₦{completedPayoutsTotal.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="font-display text-2xl font-bold">{payouts.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="font-display">Payout Requests</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => {
                      const affInfo = (payout as any).affiliates;
                      const payoutStatus = payout.status === "paid" ? "completed" : payout.status;

                      return (
                        <TableRow key={payout.id}>
                          <TableCell>{(payout as any).affiliate_name || "—"}</TableCell>
                          <TableCell>₦{payout.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">
                            {affInfo?.bank_name ? `${affInfo.bank_name} - ${affInfo.account_number} (${affInfo.account_name})` : "No bank details"}
                          </TableCell>
                          <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              payoutStatus === "completed" ? "default" :
                              payoutStatus === "processing" ? "secondary" :
                              payoutStatus === "failed" ? "destructive" : "outline"
                            }>
                              {payoutStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              {payoutStatus === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => approvePayout(payout.id)}
                                    disabled={processingPayoutId === payout.id}
                                    className="gap-1"
                                  >
                                    {processingPayoutId === payout.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => rejectPayout(payout.id)} className="gap-1">
                                    Reject
                                  </Button>
                                </>
                              )}
                              {payoutStatus === "processing" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markPayoutCompleted(payout.id)}
                                  disabled={processingPayoutId === payout.id}
                                  className="gap-1"
                                >
                                  {processingPayoutId === payout.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                  Mark as Paid
                                </Button>
                              )}
                              {(payoutStatus === "completed" || payoutStatus === "failed") && (
                                <span className="text-sm text-muted-foreground capitalize">{payoutStatus}</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-display">Platform Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-sm space-y-2">
                  <Label>Minimum Withdrawal Amount (₦)</Label>
                  <Input
                    type="number"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    min={0}
                  />
                  <p className="text-sm text-muted-foreground">
                    Affiliates must have at least this amount to request a withdrawal.
                  </p>
                </div>
                <Button onClick={saveMinWithdrawal} disabled={savingSettings} className="gap-2">
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
