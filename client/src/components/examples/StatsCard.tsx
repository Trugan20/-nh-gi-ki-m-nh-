import { StatsCard } from '../StatsCard'
import { Calendar, DollarSign, Package, Users } from 'lucide-react'

export default function StatsCardExample() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-6">
      <StatsCard
        title="Tổng khách hàng"
        value="1,284"
        icon={Users}
        trend={{ value: 12, isPositive: true }}
      />
      <StatsCard
        title="Lịch hẹn hôm nay"
        value="24"
        icon={Calendar}
        iconColor="text-chart-2"
      />
      <StatsCard
        title="Doanh thu tháng"
        value="₫45.2M"
        icon={DollarSign}
        trend={{ value: 8, isPositive: true }}
        iconColor="text-chart-3"
      />
      <StatsCard
        title="Thuốc sắp hết"
        value="8"
        icon={Package}
        iconColor="text-destructive"
      />
    </div>
  )
}
