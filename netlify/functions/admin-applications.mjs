import { db, reply, requireAdmin, parseBody } from "./_shared.mjs";

export async function handler(event) {
  if (!requireAdmin(event)) return reply(401, { error: "غير مصرح. سجل دخول الإدارة." });
  const client = db();

  try {
    if (event.httpMethod === "GET") {
      const [{ data: settings, error: sErr }, { data: questions, error: qErr },
             { data: applications, error: aErr }] = await Promise.all([
        client.from("application_settings").select("is_open").eq("id", 1).single(),
        client.from("application_questions").select("*").order("position", { ascending: true }),
        client.from("applications").select("*").order("created_at", { ascending: false }).limit(300)
      ]);
      if (sErr || qErr || aErr) throw sErr || qErr || aErr;
      return reply(200, { settings, questions, applications });
    }

    if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });
    const body = parseBody(event);
    if (!body || typeof body.action !== "string") return reply(400, { error: "طلب غير صالح." });

    if (body.action === "set-open") {
      const { error } = await client.from("application_settings")
        .update({ is_open: Boolean(body.isOpen), updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) throw error;
      return reply(200, { ok: true });
    }

    if (body.action === "save-question") {
      const label = String(body.label || "").trim().slice(0, 500);
      const input_type = ["text", "number", "long"].includes(body.input_type) ? body.input_type : "long";
      if (!label) return reply(400, { error: "اكتب نص السؤال." });
      const payload = { label, input_type, required: Boolean(body.required),
        position: Number.isFinite(Number(body.position)) ? Number(body.position) : 0,
        active: body.active !== false };
      let result;
      if (body.id) result = await client.from("application_questions").update(payload).eq("id", body.id);
      else result = await client.from("application_questions").insert(payload);
      if (result.error) throw result.error;
      return reply(200, { ok: true });
    }

    if (body.action === "delete-question") {
      const { error } = await client.from("application_questions").delete().eq("id", body.id);
      if (error) throw error;
      return reply(200, { ok: true });
    }

    if (body.action === "review-application") {
      if (!["قيد المراجعة", "مقبول", "مرفوض"].includes(body.status)) {
        return reply(400, { error: "حالة غير صالحة." });
      }
      const { error } = await client.from("applications")
        .update({ status: body.status, admin_note: String(body.adminNote || "").slice(0, 2000),
          updated_at: new Date().toISOString() }).eq("id", body.id);
      if (error) throw error;
      return reply(200, { ok: true });
    }

    return reply(400, { error: "إجراء غير معروف." });
  } catch {
    return reply(500, { error: "تعذر تنفيذ العملية. راجع إعداد قاعدة البيانات." });
  }
}
