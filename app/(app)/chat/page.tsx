import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { material?: string; prompt?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: history } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("student_id", user.id)
    .order("created_at", { ascending: true })
    .limit(50);

  let material: { id: string; title: string; subject: string } | null = null;
  if (searchParams.material) {
    const { data: materialRow } = await supabase
      .from("materials")
      .select("id, title, subject, student_id")
      .eq("id", searchParams.material)
      .single();
    if (materialRow && materialRow.student_id === user.id) {
      material = { id: materialRow.id, title: materialRow.title, subject: materialRow.subject };
    }
  }

  return (
    <ChatWindow
      initialMessages={(history ?? []).map((h) => ({
        role: h.role,
        content: h.content,
      }))}
      material={material}
      initialPrompt={searchParams.prompt ?? null}
    />
  );
}
