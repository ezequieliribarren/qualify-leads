import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/nav-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const pendingRemarketing = await prisma.remarketingTask.count({
    where: { contactedAt: null, dueAt: { lte: new Date() } },
  });

  return (
    <div className="min-h-screen">
      <NavBar
        user={{ name: session.user.name ?? session.user.email ?? "Usuario", role: session.user.role }}
        pendingRemarketing={pendingRemarketing}
      />
      <main className="container py-8">{children}</main>
    </div>
  );
}
