import { redirect } from "next/navigation";
import { adminConfigured, adminSetupIssues, currentAdmin } from "@/lib/admin";
import { AdminLogin } from "@/components/admin/login-form";
export const metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};
export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <AdminLogin configured={adminConfigured()} issues={adminSetupIssues()} />
  );
}
