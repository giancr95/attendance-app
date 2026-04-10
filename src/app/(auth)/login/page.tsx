import { redirect } from "next/navigation";
import { FingerprintIcon } from "lucide-react";

import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Iniciar sesión · LCDP",
};

export default async function LoginPage() {
  // If already signed in, bounce to dashboard.
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <FingerprintIcon className="size-6" />
          </div>
          <CardTitle className="text-xl">LaCasaDelPlastico</CardTitle>
          <CardDescription>Control de asistencia y RRHH</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
