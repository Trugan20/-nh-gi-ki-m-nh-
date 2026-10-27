import { useCart } from "@/lib/cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clear, total } = useCart();

  if (items.length === 0) {
    return <p className="text-muted-foreground">Giỏ hàng đang trống.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giỏ hàng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{it.name}</div>
              <div className="text-sm text-muted-foreground">{it.price.toLocaleString("vi-VN")} VND</div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) => updateQuantity(it.id, parseInt(e.target.value || "1", 10))}
                className="w-20"
              />
              <Button variant="ghost" onClick={() => removeItem(it.id)}>
                Xóa
              </Button>
            </div>
          </div>
        ))}

        <div className="mt-2 flex items-center justify-between border-t pt-4">
          <div className="text-lg font-semibold">Tổng: {total.toLocaleString("vi-VN")} VND</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clear}>
              Xóa giỏ
            </Button>
            <Button data-testid="button-checkout" disabled>
              Thanh toán (sắp có)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
