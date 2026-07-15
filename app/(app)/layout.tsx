import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: student } = await supabase
    .from("students")
    .select("id, name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!student) {
    const { data: created } = await supabase
      .from("students")
      .insert({
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.name as string | undefined) ?? user.email?.split("@")[0] ?? "Student",
      })
      .select("id, name, email")
      .single();
    student = created;
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <Sidebar studentName={student?.name ?? "Student"} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
