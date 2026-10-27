import { useMemo, useState } from "react";
import { Mail, Phone, Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AddCustomerDialog } from "./AddCustomerDialog";
import { AddPetDialog } from "./AddPetDialog";
import { EditCustomerDialog } from "./EditCustomerDialog";

export function CustomerList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddPetDialog, setShowAddPetDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [petSearch, setPetSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const customersUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (statusFilter !== "all") params.set("active", String(statusFilter === "active"));
    return `/api/customers${params.toString() ? `?${params.toString()}` : ""}`;
  }, [searchTerm, statusFilter]);

  const { data: customers = [], isLoading } = useQuery<any[]>({ queryKey: [customersUrl] });
  const { data: allPets = [] } = useQuery<any[]>({ queryKey: ["/api/pets"] });

  const { data: petsByCustomerName = [] } = useQuery<any[]>({
    queryKey: ["/api/pets", { customerName: petSearch.trim() }],
    enabled: petSearch.trim().length > 0,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Duyệt khách hàng thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"], exact: false });
      toast({ title: "Đã duyệt khách hàng" });
    },
    onError: () => toast({ title: "Không thể duyệt khách hàng", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}/deactivate`, { method: "POST" });
      if (!res.ok) throw new Error("Ngừng hoạt động thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"], exact: false });
      toast({ title: "Đã cập nhật trạng thái khách hàng" });
    },
    onError: () => toast({ title: "Không thể cập nhật trạng thái", variant: "destructive" }),
  });

  const getPetCount = (customerId: string) => allPets.filter((pet: any) => pet.customerId === customerId).length;

  if (isLoading) return <p className="text-muted-foreground">Đang tải danh sách khách hàng...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
            Quản lý khách hàng
          </h1>
          <p className="mt-1 text-muted-foreground">Theo dõi hồ sơ khách hàng và thú cưng đi kèm.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-customer">
          <Plus className="mr-2 h-4 w-4" />
          Thêm khách hàng
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <CardTitle className="flex-1">Danh sách khách hàng ({customers.length})</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Tìm theo tên, email, số điện thoại" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {customers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Không có khách hàng phù hợp.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Số thú cưng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{customer.name?.[0] || "K"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.address || "Chưa cập nhật địa chỉ"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.isActive ? <Badge>Đang hoạt động</Badge> : <Badge variant="destructive">Chờ duyệt</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getPetCount(customer.id)} thú cưng</Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomerId(customer.id);
                          setShowAddPetDialog(true);
                        }}
                      >
                        Thêm thú cưng
                      </Button>

                      {!customer.isActive ? (
                        <Button size="sm" onClick={() => approveMutation.mutate(customer.id)}>
                          Duyệt
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => deactivateMutation.mutate(customer.id)}>
                          Tạm khóa
                        </Button>
                      )}

                      <Button size="sm" variant="outline" onClick={() => setEditingCustomer(customer)}>
                        Chỉnh sửa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tìm thú cưng theo tên khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nhập tên khách hàng để tìm thú cưng" value={petSearch} onChange={(e) => setPetSearch(e.target.value)} />
          {petSearch.trim() ? (
            petsByCustomerName.length > 0 ? (
              <div className="grid gap-2">
                {petsByCustomerName.map((pet: any) => (
                  <div key={pet.id} className="rounded-lg border bg-card/80 p-3 text-sm">
                    <p className="font-medium">{pet.name}</p>
                    <p className="text-muted-foreground">
                      {pet.species} - Chủ nuôi: {pet.customerName || pet.customerId}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không tìm thấy thú cưng phù hợp.</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Nhập tên khách hàng để hiển thị danh sách thú cưng.</p>
          )}
        </CardContent>
      </Card>

      <AddCustomerDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <AddPetDialog open={showAddPetDialog} onOpenChange={setShowAddPetDialog} customerId={selectedCustomerId} />
      <EditCustomerDialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)} customer={editingCustomer} />
    </div>
  );
}
