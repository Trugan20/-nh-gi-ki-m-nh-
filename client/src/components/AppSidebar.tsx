import { Calendar, Camera, Clock3, FileText, LayoutDashboard, Package, Receipt, Stethoscope, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { title: "Tổng quan", url: "/", icon: LayoutDashboard },
  { title: "Bác sĩ", url: "/doctors", icon: Stethoscope },
  { title: "Khách hàng", url: "/customers", icon: Users },
  { title: "Lịch hẹn", url: "/appointments", icon: Calendar },
  { title: "Hồ sơ khám", url: "/medical-records", icon: FileText },
  { title: "Ca bác sĩ", url: "/shifts", icon: Clock3 },
  { title: "Kho thuốc", url: "/inventory", icon: Package },
  { title: "Hóa đơn", url: "/invoices", icon: Receipt },
  { title: "Camera giám sát", url: "/cameras", icon: Camera },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-sky-100/70 bg-white/70 backdrop-blur-xl">
      <SidebarHeader className="border-b border-sidebar-border/70 px-4 py-5">
        <div className="rounded-2xl bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 p-4 text-white shadow-lg shadow-sky-300/40">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold leading-tight">Pet Clinic Pro</h2>
              <p className="text-xs text-white/90">Nền tảng vận hành phòng khám</p>
            </div>
          </div>
          <p className="text-xs text-white/90">Vận hành phòng khám thú y chuẩn hóa và chuyên nghiệp.</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-white/75 px-3 py-2 shadow-sm">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">PK</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Đội ngũ phòng khám</p>
            <p className="text-xs text-muted-foreground">Quản trị - Bác sĩ - Lễ tân</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
