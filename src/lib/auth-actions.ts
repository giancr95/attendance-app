// Server actions for NextAuth v5 credentials login/logout.
// Forms call these directly — no API routes needed.
"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return undefined;
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { error: "Correo o contraseña incorrectos." };
      }
      return { error: "No se pudo iniciar sesión. Intenta de nuevo." };
    }
    // NEXT_REDIRECT is thrown on successful signIn — let it bubble up.
    throw err;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
