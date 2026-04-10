// Server actions for managing employees: status, role, department, contact.
//
// Used by the Employees page action menu. Admin-only — every action calls
// requireAdmin() before touching the DB.
"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  Department,
  Role,
  UserStatus,
} from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setUserStatus(
  userId: string,
  status: UserStatus
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.user.update({
      where: { id: userId },
      data: { status },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function activateAllUsers(): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.user.updateMany({
      where: { status: UserStatus.INACTIVE },
      data: { status: UserStatus.ACTIVE },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function setUserDepartment(
  userId: string,
  department: Department
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.user.update({
      where: { id: userId },
      data: { department },
    });
    revalidatePath("/employees");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function setUserRole(
  userId: string,
  role: Role
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    revalidatePath("/employees");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// Lets an admin set/reset login credentials for an employee.
// Pass an empty password to clear it (employee can no longer log in).
export async function setUserCredentials(
  userId: string,
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return { ok: false, error: "Correo inválido." };
    }

    const passwordHash = password
      ? await bcrypt.hash(password, 12)
      : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: email || null,
        passwordHash,
      },
    });
    revalidatePath("/employees");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ───────────────────────────── profile ─────────────────────────────

export type UpdateProfileInput = {
  userId: string;
  name?: string;
  email?: string | null;
  newPassword?: string;
  hourlyRate?: number | null;
  monthlySalary?: number | null;
  hireDate?: Date | null;
  department?: Department;
  role?: Role;
  status?: UserStatus;
};

/**
 * Single entry-point to update everything an admin can change about an
 * employee. Each field is optional — only provided fields are touched.
 */
export async function updateUserProfile(
  input: UpdateProfileInput
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (input.email && !/^[^@]+@[^@]+\.[^@]+$/.test(input.email)) {
      return { ok: false, error: "Correo inválido." };
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) return { ok: false, error: "El nombre no puede estar vacío." };
      data.name = trimmed;
      // If an admin has manually renamed this employee, the device's
      // corrupt-name flag no longer applies — clear it.
      data.hasDataIssue = false;
    }
    if (input.email !== undefined) data.email = input.email || null;
    if (input.hourlyRate !== undefined) data.hourlyRate = input.hourlyRate;
    if (input.monthlySalary !== undefined) data.monthlySalary = input.monthlySalary;
    if (input.hireDate !== undefined) data.hireDate = input.hireDate;
    if (input.department !== undefined) data.department = input.department;
    if (input.role !== undefined) data.role = input.role;
    if (input.status !== undefined) data.status = input.status;
    if (input.newPassword) {
      data.passwordHash = await bcrypt.hash(input.newPassword, 12);
    }

    await prisma.user.update({
      where: { id: input.userId },
      data,
    });

    revalidatePath("/employees");
    revalidatePath("/payroll");
    revalidatePath("/vacations");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// Convenience: create a brand-new web-only user (no device link).
// Used for admin/management accounts that don't clock in physically.
export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role?: Role;
  department?: Department;
};

export async function createWebUser(
  input: CreateUserInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!input.email || !/^[^@]+@[^@]+\.[^@]+$/.test(input.email)) {
      return { ok: false, error: "Correo inválido." };
    }
    if (!input.password || input.password.length < 6) {
      return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      return { ok: false, error: "Ya existe un usuario con ese correo." };
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email,
        passwordHash,
        role: input.role ?? "EMPLOYEE",
        department: input.department ?? "ADMINISTRACION",
        status: "ACTIVE",
      },
    });

    revalidatePath("/employees");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
