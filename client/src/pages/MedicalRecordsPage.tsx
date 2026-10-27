import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MedicalRecordForm } from "@/components/MedicalRecordForm";

export default function MedicalRecordsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: medicalRecords = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/medical-records"] });
  const { data: pets = [] } = useQuery<any[]>({ queryKey: ["/api/pets"] });
  const { data: veterinarians = [] } = useQuery<any[]>({ queryKey: ["/api/doctors"] });

  const getPetName = (petId: string) => pets.find((pet: any) => pet.id === petId)?.name || "Không xác định";
  const getVetName = (vetId: string) => veterinarians.find((vet: any) => vet.id === vetId)?.name || "Không xác định";

  const filteredRecords = medicalRecords.filter((record: any) => {
    const term = searchTerm.toLowerCase();
    const diagnosis = (record.diagnosis || "").toLowerCase();

    return (
      diagnosis.includes(term) ||
      getPetName(record.petId).toLowerCase().includes(term) ||
      getVetName(record.veterinarianId).toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Quản lý hồ sơ khám bệnh</h1>
        <p className="mt-1 text-muted-foreground">Xem lịch sử hồ sơ và tạo mới hồ sơ điều trị.</p>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Danh sách hồ sơ</TabsTrigger>
          <TabsTrigger value="create">Tạo hồ sơ mới</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Input placeholder="Tìm theo chẩn đoán, thú cưng, bác sĩ" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Badge variant="secondary">{filteredRecords.length} hồ sơ</Badge>
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Đang tải hồ sơ khám bệnh...</p>
          ) : (
            <div className="rounded-xl border bg-white/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày khám</TableHead>
                    <TableHead>Thú cưng</TableHead>
                    <TableHead>Chẩn đoán</TableHead>
                    <TableHead>Triệu chứng</TableHead>
                    <TableHead>Điều trị</TableHead>
                    <TableHead>Bác sĩ</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        {searchTerm ? "Không tìm thấy hồ sơ theo điều kiện tìm kiếm." : "Hiện chưa có hồ sơ khám bệnh."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.visitDate).toLocaleDateString("vi-VN")}</TableCell>
                        <TableCell className="font-medium">{getPetName(record.petId)}</TableCell>
                        <TableCell>{record.diagnosis || "-"}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={record.symptoms || ""}>
                          {record.symptoms || "-"}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate" title={record.treatment || ""}>
                          {record.treatment || "-"}
                        </TableCell>
                        <TableCell>{getVetName(record.veterinarianId)}</TableCell>
                        <TableCell className="max-w-[240px] truncate" title={record.notes || ""}>
                          {record.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Xem
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="create">
          <MedicalRecordForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
