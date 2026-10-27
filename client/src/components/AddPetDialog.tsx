import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const petSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng"),
  name: z.string().min(1, "Tên thú cưng là bắt buộc"),
  species: z.string().min(1, "Loài là bắt buộc"),
  breed: z.string().optional(),
  age: z.string().optional(),
  weight: z.string().optional(),
  gender: z.string().optional(),
  microchip: z.string().optional(),
});

type PetFormData = z.infer<typeof petSchema>;

interface AddPetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
}

export function AddPetDialog({ open, onOpenChange, customerId }: AddPetDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    enabled: !customerId,
  });

  const form = useForm<PetFormData>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      customerId: customerId || "",
      name: "",
      species: "",
      breed: "",
      age: "",
      weight: "",
      gender: "",
      microchip: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        customerId: customerId || "",
        name: "",
        species: "",
        breed: "",
        age: "",
        weight: "",
        gender: "",
        microchip: "",
      });
    }
  }, [open, customerId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PetFormData) => {
      const payload = {
        customerId: data.customerId,
        name: data.name,
        species: data.species,
        breed: data.breed || null,
        age: data.age ? parseInt(data.age, 10) : null,
        weight: data.weight || null,
        gender: data.gender || null,
        microchip: data.microchip || null,
      };
      const res = await apiRequest("POST", "/api/pets", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"], exact: false });
      toast({ title: "Thêm thú cưng thành công" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Không thể thêm thú cưng",
        description: error?.message || "Vui lòng kiểm tra lại thông tin",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm thú cưng mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          {!customerId && (
            <div className="space-y-2">
              <Label htmlFor="customerId">Khách hàng *</Label>
              <Select value={form.watch("customerId")} onValueChange={(value) => form.setValue("customerId", value, { shouldValidate: true })}>
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
              {form.formState.errors.customerId && <p className="text-sm text-destructive">{form.formState.errors.customerId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên thú cưng *</Label>
              <Input id="name" {...form.register("name")} data-testid="input-pet-name" />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="species">Loài *</Label>
              <Select value={form.watch("species")} onValueChange={(value) => form.setValue("species", value, { shouldValidate: true })}>
                <SelectTrigger data-testid="select-species">
                  <SelectValue placeholder="Chọn loài" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chó">Chó</SelectItem>
                  <SelectItem value="Mèo">Mèo</SelectItem>
                  <SelectItem value="Chim">Chim</SelectItem>
                  <SelectItem value="Thỏ">Thỏ</SelectItem>
                  <SelectItem value="Sóc">Sóc</SelectItem>
                  <SelectItem value="Chuột hamster">Chuột hamster</SelectItem>
                  <SelectItem value="Rùa">Rùa</SelectItem>
                  <SelectItem value="Cá">Cá</SelectItem>
                  <SelectItem value="Khác">Khác</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.species && <p className="text-sm text-destructive">{form.formState.errors.species.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breed">Giống</Label>
              <Input id="breed" {...form.register("breed")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính</Label>
              <Select value={form.watch("gender")} onValueChange={(value) => form.setValue("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Đực">Đực</SelectItem>
                  <SelectItem value="Cái">Cái</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Tuổi</Label>
              <Input id="age" type="number" {...form.register("age")} placeholder="Nhập tuổi" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Cân nặng (kg)</Label>
              <Input id="weight" {...form.register("weight")} placeholder="Nhập cân nặng" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="microchip">Mã microchip</Label>
            <Input id="microchip" {...form.register("microchip")} placeholder="Nhập mã microchip (nếu có)" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-pet">
              {createMutation.isPending ? "Đang lưu..." : "Lưu thú cưng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
