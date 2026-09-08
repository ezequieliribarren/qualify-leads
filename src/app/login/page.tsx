import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/leads");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Dashboard de Leads</h1>
          <p className="text-sm text-muted-foreground">Ingresá con tu usuario y contraseña</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
