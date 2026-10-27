import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const appointmentSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng"),
  petId: z.string().min(1, "Vui lòng chọn thú cưng"),
  veterinarianId: z.string().optional(),
  appointmentDate: z.string().min(1, "Vui lòng chọn ngày khám"),
  appointmentTime: z.string().min(1, "Vui lòng chọn giờ khám"),
  appointmentType: z.string().min(1, "Vui lòng chọn dịch vụ"),
  status: z.enum(["pending", "confirmed", "urgent", "cancelled", "completed"]),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AddAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAppointmentDialog({ open, onOpenChange }: AddAppointmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customerId: "",
      petId: "",
      veterinarianId: "",
      appointmentDate: "",
      appointmentTime: "09:00",
      appointmentType: "",
      status: "pending",
      notes: "",
    },
  });

  const selectedCustomerId = form.watch("customerId");

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: pets = [] } = useQuery<any[]>({
    queryKey: ["/api/pets", { customerId: selectedCustomerId }],
    enabled: Boolean(selectedCustomerId),
  });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/doctors", { active: true }] });

  const createMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const localDateTime = `${data.appointmentDate}T${data.appointmentTime}:00`;
      const dateTime = new Date(localDateTime);
      if (Number.isNaN(dateTime.getTime())) {
        throw new Error("Ngày giờ lịch hẹn không hợp lệ");
      }

      const payload = {
        petId: data.petId,
        customerId: data.customerId,
        veterinarianId: data.veterinarianId || null,
        appointmentDate: localDateTime,
        appointmentType: data.appointmentType,
        status: data.status,
        notes: data.notes || null,
      };

      const res = await apiRequest("POST", "/api/appointments", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Đặt lịch thành công" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Không thể đặt lịch",
        description: error?.message || "Vui lòng kiểm tra lại thông tin lịch hẹn",
        variant: "destructive",
      });
    },
  });

  const serviceOptions = useMemo(() => ["Khám tổng quát", "Tiêm phòng", "Phẫu thuật", "Tái khám", "Chăm sóc"], []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Tạo lịch hẹn khám</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label>Khách hàng</Label>
            <Select
              value={form.watch("customerId")}
              onValueChange={(value) => {
                form.setValue("customerId", value, { shouldValidate: true });
                form.setValue("petId", "");
              }}
            >
              <SelectTrigger data-testid="select-customer">
                <SelectValue placeholder="Chọn khách hàng" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer: any) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Thú cưng</Label>
            <Select
              value={form.watch("petId")}
              onValueChange={(value) => form.setValue("petId", value, { shouldValidate: true })}
              disabled={!selectedCustomerId}
            >
              <SelectTrigger data-testid="select-pet">
                <SelectValue placeholder={selectedCustomerId ? "Chọn thú cưng" : "Chọn khách hàng trước"} />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet: any) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bác sĩ phụ trách</Label>
            <Select value={form.watch("veterinarianId")} onValueChange={(value) => form.setValue("veterinarianId", value)}>
              <SelectTrigger data-testid="select-vet">
                <SelectValue placeholder="Không bắt buộc" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor: any) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} {doctor.specialization ? `- ${doctor.specialization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ngày khám</Label>
              <Input type="date" {...form.register("appointmentDate")} data-testid="input-appointment-date" />
            </div>
            <div className="space-y-2">
              <Label>Giờ khám</Label>
              <Input type="time" {...form.register("appointmentTime")} data-testid="input-appointment-time" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dịch vụ</Label>
              <Select value={form.watch("appointmentType")} onValueChange={(value) => form.setValue("appointmentType", value, { shouldValidate: true })}>
                <SelectTrigger data-testid="select-service">
                  <SelectValue placeholder="Chọn dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={form.watch("status")} onValueChange={(value: any) => form.setValue("status", value, { shouldValidate: true })}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ xác nhận</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea rows={3} {...form.register("notes")} placeholder="Thông tin thêm nếu có" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-appointment">
              {createMutation.isPending ? "Đang lưu..." : "Tạo lịch hẹn"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
