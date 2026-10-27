import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const inventorySchema = z.object({
  code: z.string().min(1, "Mã vật tư là bắt buộc"),
  name: z.string().min(1, "Tên vật tư là bắt buộc"),
  category: z.string().min(1, "Danh mục là bắt buộc"),
  unit: z.string().min(1, "Đơn vị là bắt buộc"),
  stock: z.coerce.number().int().min(0, "Tồn kho không hợp lệ"),
  minStock: z.coerce.number().int().min(0, "Tồn tối thiểu không hợp lệ"),
  price: z.string().min(1, "Giá là bắt buộc"),
  expiryDate: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

const categories = ["Thuốc", "Vắc-xin", "Vật tư y tế", "Thực phẩm", "Khác"];

export function InventoryTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory", { search: searchTerm.trim() || undefined }],
  });

  const lowStockItems = inventory.filter((item: any) => Number(item.stock || 0) <= Number(item.minStock || 0));

  const filteredInventory = inventory
    .filter((item: any) => filterCategory === "all" || item.category === filterCategory)
    .filter((item: any) => !showLowStockOnly || Number(item.stock || 0) <= Number(item.minStock || 0));

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      code: "",
      name: "",
      category: "",
      unit: "",
      stock: 0,
      minStock: 10,
      price: "",
      expiryDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InventoryFormData) => {
      const itemRes = await apiRequest("POST", "/api/inventory", {
        code: data.code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        stock: data.stock,
        minStock: data.minStock,
        price: data.price,
      });
      const created = await itemRes.json();

      if (data.expiryDate) {
        await apiRequest("POST", "/api/stock-batches", {
          inventoryId: created.id,
          batchNumber: `B${Date.now()}`,
          quantity: data.stock,
          expiryDate: new Date(data.expiryDate).toISOString(),
          supplier: null,
        });
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: "Thêm vật tư thành công" });
      form.reset();
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Không thể thêm vật tư",
        description: error?.message || "Vui lòng kiểm tra thông tin nhập",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải dữ liệu kho...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
            Quản lý kho thuốc và vật tư
          </h1>
          <p className="mt-1 text-muted-foreground">Theo dõi số lượng, cảnh báo sắp hết và giá bán.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-inventory">
          <Plus className="mr-2 h-4 w-4" />
          Thêm vật tư
        </Button>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Cảnh báo tồn kho thấp</p>
              <p className="text-sm text-amber-700">{lowStockItems.length} mặt hàng cần nhập bổ sung.</p>
            </div>
            <div className="ml-auto">
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                onClick={() => {
                  setShowLowStockOnly(true);
                  setFilterCategory("all");
                  setSearchTerm("");
                }}
              >
                Xem mặt hàng sắp hết
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showLowStockOnly && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <p className="text-sm text-sky-800">Đang bật bộ lọc: chỉ hiển thị mặt hàng sắp hết.</p>
            <Button type="button" variant="outline" onClick={() => setShowLowStockOnly(false)}>
              Bỏ lọc
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Tìm theo mã hoặc tên thuốc" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search" />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Lọc theo danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-white/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên vật tư</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Tồn kho</TableHead>
              <TableHead className="text-right">Tồn tối thiểu</TableHead>
              <TableHead className="text-right">Giá bán</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {showLowStockOnly ? "Không có mặt hàng sắp hết theo bộ lọc hiện tại." : "Không có vật tư phù hợp."}
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((item: any) => {
                const stock = Number(item.stock || 0);
                const minStock = Number(item.minStock || 0);
                const isLowStock = stock <= minStock;

                return (
                  <TableRow key={item.id} data-testid={`row-inventory-${item.id}`} className={isLowStock ? "bg-amber-50/60" : ""}>
                    <TableCell className="font-medium" data-testid="text-item-name">
                      {item.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                      {stock} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {minStock} {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {parseFloat(item.price || "0").toLocaleString("vi-VN")} VND
                    </TableCell>
                    <TableCell>{isLowStock ? <Badge variant="outline">Sắp hết</Badge> : <Badge variant="secondary">Ổn định</Badge>}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Thêm vật tư mới</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã vật tư *</Label>
                <Input id="code" {...form.register("code")} data-testid="input-item-code" />
                {form.formState.errors.code && <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên vật tư *</Label>
                <Input id="name" {...form.register("name")} data-testid="input-item-name" />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Danh mục *</Label>
                <Select value={form.watch("category")} onValueChange={(value) => form.setValue("category", value, { shouldValidate: true })}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Đơn vị *</Label>
                <Input id="unit" {...form.register("unit")} placeholder="Hộp, lọ, gói..." />
                {form.formState.errors.unit && <p className="text-sm text-destructive">{form.formState.errors.unit.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Tồn kho *</Label>
                <Input id="stock" type="number" min={0} {...form.register("stock")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Tồn tối thiểu *</Label>
                <Input id="minStock" type="number" min={0} {...form.register("minStock")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Giá (VND) *</Label>
                <Input id="price" type="number" min={0} {...form.register("price")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Hạn sử dụng (tùy chọn)</Label>
              <Input id="expiryDate" type="date" {...form.register("expiryDate")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-inventory">
                {createMutation.isPending ? "Đang lưu..." : "Lưu vật tư"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
