import { redirect } from "next/navigation";
import { currentAdmin, dashboardData } from "@/lib/admin";
import { AdminDashboard } from "@/components/admin/dashboard";
import type { AdminData } from "@/lib/admin-model";
export const metadata = {
  title: "Event administration",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  if (!(await currentAdmin())) redirect("/admin/login");
  let data;
  try {
    data = await dashboardData();
  } catch {
    return (
      <div className="page">
        <h1>Database setup is incomplete</h1>
        <p>Apply the Supabase migrations before opening the admin panel.</p>
      </div>
    );
  }
  return <AdminDashboard initial={data as AdminData} />;
}
