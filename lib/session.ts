import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type SessionUser } from "./auth";

export async function getUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as unknown as SessionUser & { role?: string };
  return { id: u.id, name: u.name, email: u.email, role: u.role ?? "staff" };
}
export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
/** For server actions: throws instead of redirecting */
export async function assertUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  return u;
}
export async function assertAdmin(): Promise<SessionUser> {
  const u = await assertUser();
  if (u.role !== "admin") throw new Error("Admins only");
  return u;
}
