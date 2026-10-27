import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
      <Card className="mx-4 w-full max-w-md">
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 - Không tìm thấy trang</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">Đường dẫn bạn truy cập không tồn tại trong hệ thống.</p>
        </CardContent>
      </Card>
    </div>
  );
}
