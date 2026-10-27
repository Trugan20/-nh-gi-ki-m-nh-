import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [veterinarianId, setVeterinarianId] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");

  const { data: vets = [] } = useQuery<any[]>({ queryKey: ["/api/doctors", { active: true }] });
  const { data: shifts = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/doctor-shifts"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!veterinarianId || !shiftDate) {
        throw new Error("Vui lòng chọn bác sĩ và ngày trực");
      }
      const payload = {
        veterinarianId,
        shiftDate: new Date(`${shiftDate}T00:00:00`).toISOString(),
        startTime,
        endTime,
        status: "planned",
      };
      const res = await apiRequest("POST", "/api/doctor-shifts", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor-shifts"] });
      toast({ title: "Đã tạo ca trực" });
      setShowCreate(false);
      setVeterinarianId("");
      setShiftDate("");
      setStartTime("08:00");
      setEndTime("12:00");
    },
    onError: (error: any) => {
      toast({
        title: "Không thể tạo ca trực",
        description: error?.message || "Dữ liệu ca trực không hợp lệ",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/doctor-shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctor-shifts"] });
      toast({ title: "Đã xóa ca trực" });
    },
    onError: () => toast({ title: "Không thể xóa ca trực", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
            Quản lý ca làm bác sĩ
          </h1>
          <p className="mt-1 text-muted-foreground">Phân ca theo ngày và khung giờ làm việc.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo ca trực
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải lịch trực...</p>
      ) : (
        <div className="grid gap-3">
          {shifts.map((shift: any) => {
            const vet = vets.find((v: any) => v.id === shift.veterinarianId);
            return (
              <Card key={shift.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-[220px] flex-1">
                    <p className="font-medium">{shift.veterinarianName || vet?.name || shift.veterinarianId}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(shift.shiftDate).toLocaleDateString("vi-VN")} - {shift.startTime} đến {shift.endTime}
                    </p>
                  </div>
                  <Badge>{shift.status === "planned" ? "Đã lên kế hoạch" : shift.status}</Badge>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(shift.id)}>
                    Xóa ca
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {shifts.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">Chưa có ca trực nào.</CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo ca trực mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Bác sĩ</Label>
              <Select value={veterinarianId} onValueChange={setVeterinarianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bác sĩ" />
                </SelectTrigger>
                <SelectContent>
                  {vets.map((vet: any) => (
                    <SelectItem key={vet.id} value={vet.id}>
                      {vet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ngày trực</Label>
              <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Giờ bắt đầu</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Giờ kết thúc</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Hủy
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang lưu..." : "Lưu ca trực"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
