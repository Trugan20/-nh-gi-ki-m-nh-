import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory", { search }],
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-card-border bg-gradient-to-r from-sky-50 to-cyan-50 p-5">
        <h1 className="font-serif text-2xl font-bold">Cửa hàng thú y</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tìm thuốc, vật tư và sản phẩm chăm sóc thú cưng theo danh mục.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Tìm sản phẩm, thuốc hoặc phụ kiện..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải dữ liệu sản phẩm...</p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
          Không tìm thấy sản phẩm phù hợp.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it: any) => (
            <Card key={it.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{it.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{it.category}</p>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <div className="font-semibold">{Number(it.price || 0).toLocaleString("vi-VN")} VND</div>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/product/${it.id}`}>Xem chi tiết</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
