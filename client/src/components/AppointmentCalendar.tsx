import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AddAppointmentDialog } from "./AddAppointmentDialog";

const statusLabel: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  urgent: "Khẩn cấp",
  cancelled: "Đã hủy",
  completed: "Hoàn thành",
};

const statusClass: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
  completed: "bg-sky-100 text-sky-700",
};

function dateToKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AppointmentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dayKey = useMemo(
    () => ["/api/appointments", { date: dateToKey(currentDate) }] as const,
    [currentDate],
  );

  const managementKey = useMemo(() => {
    const params: Record<string, string> = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    return ["/api/appointments", params] as const;
  }, [statusFilter, search]);

  const { data: dayAppointments = [], isLoading: loadingDay } = useQuery<any[]>({ queryKey: dayKey });
  const { data: allAppointments = [], isLoading: loadingMgmt } = useQuery<any[]>({ queryKey: managementKey });

  const sortedManagementAppointments = useMemo(() => {
    return [...allAppointments].sort((a, b) => {
      const byCreated =
        new Date(b.createdAt ?? b.appointmentDate).getTime() -
        new Date(a.createdAt ?? a.appointmentDate).getTime();

      if (byCreated !== 0) return byCreated;
      return new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
    });
  }, [allAppointments]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Đã cập nhật lịch hẹn" });
    },
    onError: (error: any) =>
      toast({
        title: "Cập nhật thất bại",
        description: error?.message || "Không thể cập nhật trạng thái lịch hẹn.",
        variant: "destructive",
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Đã hủy lịch hẹn" });
    },
    onError: (error: any) =>
      toast({
        title: "Hủy lịch thất bại",
        description: error?.message || "Không thể hủy lịch hẹn.",
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
            Quản lý lịch hẹn khám
          </h1>
          <p className="mt-1 text-muted-foreground">Theo dõi lịch theo ngày, cập nhật trạng thái và xử lý hủy hẹn.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-appointment">
          <Plus className="mr-2 h-4 w-4" />
          Tạo lịch hẹn
        </Button>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily">Lịch theo ngày</TabsTrigger>
          <TabsTrigger value="management">Quản lý toàn bộ</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="font-medium">{currentDate.toLocaleDateString("vi-VN")}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Hôm nay
            </Button>
          </div>

          {loadingDay ? (
            <p className="text-muted-foreground">Đang tải lịch trong ngày...</p>
          ) : dayAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Không có lịch hẹn trong ngày đã chọn.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {dayAppointments.map((appointment: any) => (
                <Card key={appointment.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="w-28 font-mono text-sm">
                      {new Date(appointment.appointmentDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <p className="font-medium">{appointment.petName || appointment.petId}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.customerName || appointment.customerId} - {appointment.appointmentType}
                      </p>
                    </div>
                    <Badge className={statusClass[appointment.status] || statusClass.pending}>
                      {statusLabel[appointment.status] || appointment.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="management" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Tìm theo tên khách hàng hoặc thú cưng" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ xác nhận</SelectItem>
                <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
                <SelectItem value="urgent">Khẩn cấp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingMgmt ? (
            <p className="text-muted-foreground">Đang tải danh sách lịch hẹn...</p>
          ) : (
            <div className="grid gap-3">
              {sortedManagementAppointments.map((appointment: any) => (
                <Card key={appointment.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>{appointment.petName || appointment.petId}</span>
                      <Badge className={statusClass[appointment.status] || statusClass.pending}>
                        {statusLabel[appointment.status] || appointment.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{appointment.customerName || appointment.customerId}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(appointment.appointmentDate).toLocaleString("vi-VN")} - {appointment.appointmentType}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          updateStatusMutation.isPending ||
                          appointment.status === "confirmed" ||
                          appointment.status === "completed" ||
                          appointment.status === "cancelled"
                        }
                        onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "confirmed" })}
                      >
                        Xác nhận
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          updateStatusMutation.isPending ||
                          appointment.status === "completed" ||
                          appointment.status === "cancelled"
                        }
                        onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "completed" })}
                      >
                        Hoàn thành
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={
                          cancelMutation.isPending ||
                          appointment.status === "cancelled" ||
                          appointment.status === "completed"
                        }
                        onClick={() => cancelMutation.mutate(appointment.id)}
                      >
                        Hủy lịch
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {sortedManagementAppointments.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">Không có lịch hẹn phù hợp bộ lọc.</CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddAppointmentDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
