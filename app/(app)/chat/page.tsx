import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function ChatPage() {
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

  return (
    <ChatWindow
      initialMessages={(history ?? []).map((h) => ({
        role: h.role,
        content: h.content,
      }))}
    />
  );
}
