import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import AccessibilityPanel from "@/components/accessibility/AccessibilityPanel";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <AccessibilityPanel />
    </div>
  );
}
