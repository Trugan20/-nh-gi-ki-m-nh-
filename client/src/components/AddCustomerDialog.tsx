import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const customerSchema = z.object({
  name: z.string().min(1, "Họ tên là bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().regex(/^\d{10}$/, "Số điện thoại phải gồm đúng 10 chữ số"),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", email: "", phone: "", address: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const res = await apiRequest("POST", "/api/customers", { ...data, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"], exact: false });
      toast({ title: "Thêm khách hàng thành công" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Không thể thêm khách hàng",
        description: error?.message || "Vui lòng kiểm tra lại thông tin",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm khách hàng mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Họ và tên *</Label>
            <Input id="name" {...form.register("name")} data-testid="input-customer-name" />
            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...form.register("email")} data-testid="input-customer-email" />
            {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại *</Label>
            <Input id="phone" {...form.register("phone")} data-testid="input-customer-phone" />
            {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Textarea id="address" {...form.register("address")} rows={3} data-testid="input-customer-address" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-customer">
              {createMutation.isPending ? "Đang lưu..." : "Lưu khách hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
