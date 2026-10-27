import { useQuery } from "@tanstack/react-query";
import { Activity, BadgeDollarSign, Boxes, CalendarClock, FileSpreadsheet, Pill, Sparkles, TriangleAlert } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "./StatsCard";

type DashboardStats = {
  todayAppointments: number;
  lowStockCount: number;
  monthlyRevenue: number;
  orderCount: number;
  medicineCount: number;
  remainingStock: number;
};

type RevenueDailyPoint = {
  date: string;
  label: string;
  revenue: number;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: revenueDaily = [] } = useQuery<RevenueDailyPoint[]>({
    queryKey: ["/api/reports/revenue-daily", { days: 15 }],
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải dữ liệu tổng quan...</p>;
  }

  const peakRevenue = revenueDaily.reduce((max, point) => Math.max(max, point.revenue), 0);
  const totalRevenueRange = revenueDaily.reduce((sum, point) => sum + point.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100 p-6 shadow-sm">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="absolute -bottom-16 left-20 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="mb-3 bg-sky-600 text-white hover:bg-sky-700">
              <Sparkles className="mr-1 h-3 w-3" />
              Trung tâm điều hành thông minh
            </Badge>
            <h1 className="font-serif text-3xl font-bold tracking-tight" data-testid="text-page-title">
              Tổng quan vận hành phòng khám
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Theo dõi doanh thu, lịch khám, cảnh báo tồn kho và hiệu suất dịch vụ theo thời gian thực.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs text-muted-foreground">Doanh thu 15 ngày gần nhất</p>
              <p className="text-lg font-semibold text-sky-700">{formatVnd(totalRevenueRange)}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur">
              <p className="text-xs text-muted-foreground">Đỉnh doanh thu theo ngày</p>
              <p className="text-lg font-semibold text-cyan-700">{formatVnd(peakRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatsCard title="Tổng doanh thu" value={formatVnd(stats?.monthlyRevenue ?? 0)} icon={BadgeDollarSign} iconColor="text-chart-3" />
        <StatsCard title="Số đơn hàng" value={stats?.orderCount ?? 0} icon={FileSpreadsheet} iconColor="text-primary" />
        <StatsCard title="Mặt hàng thuốc" value={stats?.medicineCount ?? 0} icon={Pill} iconColor="text-chart-2" />
        <StatsCard title="Tồn kho còn lại" value={stats?.remainingStock ?? 0} icon={Boxes} iconColor="text-chart-1" />
        <StatsCard title="Lịch hẹn hôm nay" value={stats?.todayAppointments ?? 0} icon={CalendarClock} />
        <StatsCard title="Cảnh báo sắp hết" value={stats?.lowStockCount ?? 0} icon={TriangleAlert} iconColor="text-destructive" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="border-sky-100 bg-gradient-to-b from-white to-sky-50/40">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Biểu đồ doanh thu theo ngày</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Theo dõi biến động doanh thu trong 15 ngày gần nhất.</p>
              </div>
              <Badge variant="outline" className="border-sky-200 text-sky-700">
                <Activity className="mr-1 h-3 w-3" />
                Dữ liệu trực tiếp
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {revenueDaily.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Chưa có dữ liệu doanh thu để hiển thị.</p>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueDaily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(2,132,199,0.15)" />
                    <XAxis dataKey="label" tick={{ fill: "#334155", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: "#334155", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => `${Number(value).toLocaleString("vi-VN")} VND`}
                      labelFormatter={(label) => `Ngày ${label}`}
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(125,211,252,0.7)", boxShadow: "0 10px 28px rgba(2,132,199,0.18)" }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={3} fill="url(#revenueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-cyan-100 bg-gradient-to-b from-white to-cyan-50/50">
          <CardHeader>
            <CardTitle>Ghi chú vận hành</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-sky-100 bg-white/80 p-3">
              <p className="font-medium text-sky-800">Lịch hẹn trong ngày</p>
              <p className="mt-1 text-muted-foreground">
                Hôm nay có <strong>{stats?.todayAppointments ?? 0}</strong> lịch hẹn cần xử lý.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="font-medium text-amber-800">Tồn kho cần chú ý</p>
              <p className="mt-1 text-muted-foreground">
                Có <strong>{stats?.lowStockCount ?? 0}</strong> mặt hàng ở ngưỡng tồn kho thấp.
              </p>
            </div>

            <div className="rounded-xl border border-cyan-100 bg-white/80 p-3">
              <p className="font-medium text-cyan-800">Khuyến nghị</p>
              <p className="mt-1 text-muted-foreground">
                Ưu tiên nhập bổ sung thuốc bán nhanh và xác nhận lịch hẹn chưa duyệt trong ca sáng.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
