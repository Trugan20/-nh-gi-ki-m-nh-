import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import AppointmentsPage from "@/pages/AppointmentsPage";
import CamerasPage from "@/pages/CamerasPage";
import CustomersPage from "@/pages/CustomersPage";
import DashboardPage from "@/pages/DashboardPage";
import DoctorsPage from "@/pages/DoctorsPage";
import InventoryPage from "@/pages/InventoryPage";
import InvoicesPage from "@/pages/InvoicesPage";
import MedicalRecordsPage from "@/pages/MedicalRecordsPage";
import NotFound from "@/pages/not-found";
import ShiftsPage from "@/pages/ShiftsPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/appointments" component={AppointmentsPage} />
      <Route path="/doctors" component={DoctorsPage} />
      <Route path="/medical-records" component={MedicalRecordsPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/cameras" component={CamerasPage} />
      <Route path="/shifts" component={ShiftsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = { "--sidebar-width": "18.5rem" };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="relative flex h-screen w-full overflow-hidden bg-transparent">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_5%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(125,211,252,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(224,242,254,0.7),transparent_40%)]" />
            <AppSidebar />
            <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
              <header className="border-b border-border/60 bg-white/80 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <div className="hidden md:block">
                      <p className="text-sm font-semibold text-sky-800">Pet Clinic Pro | Nền tảng vận hành phòng khám thú y</p>
                      <p className="text-xs text-slate-500">Lịch hẹn, bác sĩ, hồ sơ khám, tồn kho và tài chính trên một hệ thống.</p>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto p-5 md:p-6 xl:p-8">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
