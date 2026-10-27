import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, iconColor = "text-primary" }: StatsCardProps) {
  return (
    <Card className="shadow-sm" data-testid={`card-stats-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" data-testid="text-stat-value">
          {value}
        </div>
        {trend && (
          <p className={cn("mt-1 text-xs", trend.isPositive ? "text-emerald-600" : "text-rose-600")}>
            {trend.isPositive ? "+" : ""}
            {trend.value}% so với tháng trước
          </p>
        )}
      </CardContent>
    </Card>
  );
}
