import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Invoice = {
  id: string;
  customerId: string;
  customerName?: string;
  invoiceNumber: string;
  totalAmount: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  issuedAt: string;
};

const statusConfig = {
  paid: { label: "Đã thanh toán", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Chờ thanh toán", className: "bg-amber-100 text-amber-700" },
  overdue: { label: "Quá hạn", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Đã hủy", className: "bg-slate-100 text-slate-700" },
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [search, setSearch] = useState("");

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: inventory = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((inv) => `${inv.invoiceNumber} ${inv.customerName || inv.customerId} ${inv.status}`.toLowerCase().includes(term));
  }, [invoices, search]);

  const selectedItem = inventory.find((i: any) => i.id === selectedInventoryId);
  const totalPreview = selectedItem && Number(quantity) > 0 ? (parseFloat(selectedItem.price) * Number(quantity)).toFixed(2) : "0.00";

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId || !selectedInventoryId || Number(quantity) <= 0) {
        throw new Error("Vui lòng chọn khách hàng, thuốc và số lượng hợp lệ");
      }

      const invoiceRes = await apiRequest("POST", "/api/invoices", {
        customerId: selectedCustomerId,
        invoiceNumber: `INV-${Date.now()}`,
        totalAmount: "0",
        status: "pending",
      });
      const invoice = await invoiceRes.json();

      const unitPrice = selectedItem?.price || "0";
      const totalPrice = (parseFloat(unitPrice) * Number(quantity)).toFixed(2);

      await apiRequest("POST", "/api/invoice-items", {
        invoiceId: invoice.id,
        inventoryId: selectedInventoryId,
        description: selectedItem?.name || "Thuốc",
        quantity: Number(quantity),
        unitPrice,
        totalPrice,
      });

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/overview"] });
      toast({ title: "Tạo hóa đơn thành công", description: "Tồn kho đã được trừ tự động." });
      setShowCreate(false);
      setSelectedCustomerId("");
      setSelectedInventoryId("");
      setQuantity("1");
    },
    onError: (error: any) => {
      toast({
        title: "Không thể tạo hóa đơn",
        description: error?.message || "Vui lòng kiểm tra thông tin hóa đơn",
        variant: "destructive",
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const res = await apiRequest("POST", "/api/payments", {
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        paymentMethod: "cash",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/overview"] });
      toast({ title: "Thanh toán thành công" });
    },
    onError: () => toast({ title: "Thanh toán thất bại", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-page-title">
            Hóa đơn và bán thuốc
          </h1>
          <p className="mt-1 text-muted-foreground">Tạo hóa đơn từ đơn thuốc và trừ tồn kho tự động.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-create-invoice">
          <Plus className="mr-2 h-4 w-4" />
          Tạo hóa đơn
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <CardTitle className="flex-1">Danh sách hóa đơn</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Tìm theo mã, khách hàng, trạng thái" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Đang tải hóa đơn...</p>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Chưa có hóa đơn phù hợp.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã hóa đơn</TableHead>
                  <TableHead>Ngày lập</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((invoice) => {
                  const status = statusConfig[invoice.status] || statusConfig.pending;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{new Date(invoice.issuedAt).toLocaleDateString("vi-VN")}</TableCell>
                      <TableCell>{invoice.customerName || invoice.customerId}</TableCell>
                      <TableCell className="text-right font-mono">{parseFloat(invoice.totalAmount).toLocaleString("vi-VN")} VND</TableCell>
                      <TableCell>
                        <Badge className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.status === "pending" ? (
                          <Button size="sm" onClick={() => payMutation.mutate(invoice)} disabled={payMutation.isPending}>
                            Xác nhận đã thu tiền
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            Hoàn tất
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo hóa đơn từ thuốc</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Khách hàng</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
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
              <Label>Thuốc / vật tư</Label>
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mặt hàng" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - Tồn: {item.stock} - {parseFloat(item.price).toLocaleString("vi-VN")} VND
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Số lượng</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            <Card>
              <CardContent className="flex items-center justify-between p-3">
                <span className="text-sm text-muted-foreground">Tạm tính</span>
                <span className="font-semibold">{parseFloat(totalPreview).toLocaleString("vi-VN")} VND</span>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Hủy
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang tạo..." : "Tạo hóa đơn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
