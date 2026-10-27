import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import dogImage from "@assets/stock_images/cute_golden_retrieve_eabbb615.jpg";

const medicalRecordSchema = z.object({
  petId: z.string().min(1, "Vui lòng chọn thú cưng"),
  veterinarianId: z.string().min(1, "Vui lòng chọn bác sĩ"),
  symptoms: z.string().min(1, "Triệu chứng là bắt buộc"),
  diagnosis: z.string().min(1, "Chẩn đoán là bắt buộc"),
  treatment: z.string().min(1, "Phác đồ điều trị là bắt buộc"),
  notes: z.string().optional(),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

export function MedicalRecordForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPetId, setSelectedPetId] = useState("");

  const { data: pets = [] } = useQuery<any[]>({ queryKey: ["/api/pets"] });
  const { data: veterinarians = [] } = useQuery<any[]>({ queryKey: ["/api/doctors"] });
  const { data: recentRecords = [] } = useQuery<any[]>({ queryKey: ["/api/medical-records"] });

  const form = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      petId: "",
      veterinarianId: "",
      symptoms: "",
      diagnosis: "",
      treatment: "",
      notes: "",
    },
  });

  const selectedPet = pets.find((pet: any) => pet.id === selectedPetId);

  const createMutation = useMutation({
    mutationFn: async (data: MedicalRecordFormData) => {
      const res = await apiRequest("POST", "/api/medical-records", {
        petId: data.petId,
        veterinarianId: data.veterinarianId,
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        notes: data.notes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      toast({ title: "Lưu hồ sơ khám thành công" });
      form.reset();
      setSelectedPetId("");
    },
    onError: () => {
      toast({ title: "Không thể lưu hồ sơ khám", variant: "destructive" });
    },
  });

  const selectedPetRecords = recentRecords.filter((record: any) => record.petId === selectedPetId).slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
          Hồ sơ khám bệnh
        </h1>
        <p className="mt-1 text-muted-foreground">Tạo mới và cập nhật hồ sơ điều trị cho thú cưng.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tạo hồ sơ khám mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Thú cưng *</Label>
                  <Select
                    value={form.watch("petId")}
                    onValueChange={(value) => {
                      form.setValue("petId", value, { shouldValidate: true });
                      setSelectedPetId(value);
                    }}
                  >
                    <SelectTrigger data-testid="select-pet">
                      <SelectValue placeholder="Chọn thú cưng" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet: any) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} - {pet.species}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.petId && <p className="text-sm text-destructive">{form.formState.errors.petId.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Bác sĩ *</Label>
                  <Select value={form.watch("veterinarianId")} onValueChange={(value) => form.setValue("veterinarianId", value, { shouldValidate: true })}>
                    <SelectTrigger data-testid="select-doctor">
                      <SelectValue placeholder="Chọn bác sĩ" />
                    </SelectTrigger>
                    <SelectContent>
                      {veterinarians.map((vet: any) => (
                        <SelectItem key={vet.id} value={vet.id}>
                          {vet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.veterinarianId && <p className="text-sm text-destructive">{form.formState.errors.veterinarianId.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Triệu chứng *</Label>
                <Textarea placeholder="Mô tả triệu chứng hiện tại" {...form.register("symptoms")} rows={3} data-testid="input-symptoms" />
                {form.formState.errors.symptoms && <p className="text-sm text-destructive">{form.formState.errors.symptoms.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Chẩn đoán *</Label>
                <Textarea placeholder="Kết luận chẩn đoán" {...form.register("diagnosis")} rows={3} data-testid="input-diagnosis" />
                {form.formState.errors.diagnosis && <p className="text-sm text-destructive">{form.formState.errors.diagnosis.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Phác đồ điều trị *</Label>
                <Textarea placeholder="Hướng điều trị và thuốc sử dụng" {...form.register("treatment")} rows={3} data-testid="input-treatment" />
                {form.formState.errors.treatment && <p className="text-sm text-destructive">{form.formState.errors.treatment.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Ghi chú thêm</Label>
                <Textarea placeholder="Thông tin bổ sung (nếu có)" {...form.register("notes")} rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Xóa nội dung
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-record">
                  {createMutation.isPending ? "Đang lưu..." : "Lưu hồ sơ"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin thú cưng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedPet ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedPet.imageUrl || dogImage} alt={selectedPet.name} />
                      <AvatarFallback>{selectedPet.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedPet.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedPet.species}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPet.age || "-"} tuổi, {selectedPet.weight || "-"} kg
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 border-t pt-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Giống:</span> {selectedPet.breed || "Chưa cập nhật"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Giới tính:</span> {selectedPet.gender || "Chưa cập nhật"}
                    </p>
                    {selectedPet.microchip && (
                      <p>
                        <span className="text-muted-foreground">Microchip:</span> {selectedPet.microchip}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Chọn thú cưng để xem thông tin chi tiết.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Lịch sử khám gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedPetId ? (
                selectedPetRecords.length > 0 ? (
                  selectedPetRecords.map((record: any) => (
                    <div key={record.id} className="space-y-1 rounded-lg bg-muted/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{record.diagnosis}</p>
                        <Badge variant="secondary" className="text-xs">
                          Hoàn thành
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(record.visitDate).toLocaleDateString("vi-VN")}</p>
                      <p className="text-xs text-muted-foreground">{record.symptoms}</p>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Thú cưng này chưa có hồ sơ khám.</p>
                )
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Chọn thú cưng để xem lịch sử khám.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
