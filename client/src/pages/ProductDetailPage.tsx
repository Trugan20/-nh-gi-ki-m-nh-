import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/lib/cart";

export default function ProductDetailPage() {
  const [, params] = useRoute("/product/:id");
  const id = params?.id as string;
  const { addItem } = useCart();

  const { data: item, isLoading } = useQuery<any>({
    queryKey: ["/api/inventory", id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${id}`);
      if (!res.ok) throw new Error("Không thể tải thông tin sản phẩm");
      return await res.json();
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Đang tải chi tiết sản phẩm...</p>;
  if (!item) return <p className="text-muted-foreground">Không tìm thấy sản phẩm.</p>;

  const price = Number(item.price) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{item.category}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-semibold">{price.toLocaleString("vi-VN")} VND</div>
        <div className="text-sm text-muted-foreground">Đơn vị: {item.unit}</div>
        <div className="flex gap-3">
          <Button
            onClick={() => addItem({ id: item.id, name: item.name, price }, 1)}
            data-testid="button-add-to-cart"
          >
            Thêm vào giỏ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
