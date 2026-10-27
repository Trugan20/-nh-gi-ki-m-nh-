import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  specialization: "",
  licenseNumber: "",
  yearsExperience: "0",
  consultationFee: "0",
  bio: "",
  isAvailable: true,
  isActive: true,
};

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [form, setForm] = useState(initialForm);

  const doctorsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter === "active") params.set("active", "true");
    if (statusFilter === "inactive") params.set("active", "false");
    return `/api/doctors${params.toString() ? `?${params.toString()}` : ""}`;
  }, [search, statusFilter]);

  const { data: doctors = [], isLoading } = useQuery<any[]>({ queryKey: [doctorsUrl] });

  const resetForm = () => {
    setForm(initialForm);
    setEditingDoctor(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        phone: form.phone.trim() ? form.phone.trim() : null,
        bio: form.bio.trim() ? form.bio.trim() : null,
        yearsExperience: Number(form.yearsExperience || 0),
        consultationFee: form.consultationFee || "0",
      };
      const res = await apiRequest("POST", "/api/doctors", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: false });
      toast({ title: "Đã thêm bác sĩ mới" });
      setShowCreate(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Không thể thêm bác sĩ",
        description: error?.message || "Vui lòng kiểm tra lại thông tin",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingDoctor?.id) throw new Error("Thiếu mã bác sĩ");
      const payload = {
        ...form,
        phone: form.phone.trim() ? form.phone.trim() : null,
        bio: form.bio.trim() ? form.bio.trim() : null,
        yearsExperience: Number(form.yearsExperience || 0),
        consultationFee: form.consultationFee || "0",
      };
      const res = await apiRequest("PATCH", `/api/doctors/${editingDoctor.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: false });
      toast({ title: "Đã cập nhật bác sĩ" });
      setShowCreate(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Không thể cập nhật bác sĩ",
        description: error?.message || "Vui lòng kiểm tra lại thông tin",
        variant: "destructive",
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (doctor: any) => {
      const res = await apiRequest("PATCH", `/api/doctors/${doctor.id}`, {
        isAvailable: !doctor.isAvailable,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"], exact: false });
      toast({ title: "Đã cập nhật trạng thái nhận lịch" });
    },
    onError: () => {
      toast({ title: "Không thể cập nhật trạng thái nhận lịch", variant: "destructive" });
    },
  });

  const openEdit = (doctor: any) => {
    setEditingDoctor(doctor);
    setForm({
      name: doctor.name || "",
      email: doctor.email || "",
      phone: doctor.phone || "",
      specialization: doctor.specialization || "",
      licenseNumber: doctor.licenseNumber || "",
      yearsExperience: String(doctor.yearsExperience || 0),
      consultationFee: String(doctor.consultationFee || 0),
      bio: doctor.bio || "",
      isAvailable: Boolean(doctor.isAvailable),
      isActive: Boolean(doctor.isActive),
    });
    setShowCreate(true);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-card-border bg-gradient-to-r from-sky-100 via-cyan-100 to-blue-100 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
              Quản lý bác sĩ
            </h1>
            <p className="mt-1 text-muted-foreground">Quản lý hồ sơ chuyên môn, trạng thái làm việc và khả dụng đặt lịch.</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm bác sĩ
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex-1">Danh sách bác sĩ ({doctors.length})</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Tìm theo tên, email, chuyên khoa"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="inactive">Tạm khóa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Đang tải danh sách bác sĩ...</p>
          ) : doctors.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Chưa có bác sĩ nào phù hợp.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {doctors.map((doctor: any) => (
                <Card key={doctor.id} className="border-card-border/80 bg-card/90">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{doctor.name}</p>
                        <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                      </div>
                      <Badge variant={doctor.isActive ? "default" : "secondary"}>
                        {doctor.isActive ? "Hoạt động" : "Tạm khóa"}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{doctor.email}</p>
                      <p>{doctor.phone || "Chưa có số điện thoại"}</p>
                      <p>Mã hành nghề: {doctor.licenseNumber}</p>
                      <p>Kinh nghiệm: {doctor.yearsExperience || 0} năm</p>
                      <p>Phí khám: {Number(doctor.consultationFee || 0).toLocaleString("vi-VN")} VND</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <Stethoscope className="mr-1 h-3 w-3" />
                        {doctor.isAvailable ? "Sẵn sàng" : "Bận"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(doctor)}>
                        Chỉnh sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAvailabilityMutation.mutate(doctor)}
                      >
                        {doctor.isAvailable ? "Đặt bận" : "Đặt sẵn sàng"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Cập nhật bác sĩ" : "Thêm bác sĩ mới"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Họ tên</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Chuyên khoa</Label>
                <Input value={form.specialization} onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mã hành nghề</Label>
                <Input value={form.licenseNumber} onChange={(e) => setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Kinh nghiệm (năm)</Label>
                <Input type="number" min={0} value={form.yearsExperience} onChange={(e) => setForm((prev) => ({ ...prev, yearsExperience: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Phí khám (VND)</Label>
                <Input type="number" min={0} value={form.consultationFee} onChange={(e) => setForm((prev) => ({ ...prev, consultationFee: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Trạng thái tài khoản</Label>
                <Select
                  value={form.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value === "active" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Tạm khóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Trạng thái nhận lịch</Label>
              <Select
                value={form.isAvailable ? "available" : "busy"}
                onValueChange={(value) => setForm((prev) => ({ ...prev, isAvailable: value === "available" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Sẵn sàng nhận lịch</SelectItem>
                  <SelectItem value="busy">Tạm thời bận</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Giới thiệu</Label>
              <Textarea rows={3} value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => (editingDoctor ? updateMutation.mutate() : createMutation.mutate())} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Đang lưu..." : editingDoctor ? "Lưu cập nhật" : "Tạo bác sĩ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
