import { db, reply, parseBody } from "./_shared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });
  const body = parseBody(event);
  if (!body) return reply(400, { error: "بيانات غير صالحة." });

  const name = String(body.discordName || "").trim().slice(0, 100);
  const discordId = body.discordId ? String(body.discordId).trim().slice(0, 30) : null;
  const answers = body.answers;
  if (name.length < 2 || !answers || typeof answers !== "object" || Array.isArray(answers)) {
    return reply(400, { error: "أدخل اسم الديسكورد وأكمل الإجابات المطلوبة." });
  }

  try {
    const client = db();
    const { data: settings, error: settingsError } =
      await client.from("application_settings").select("is_open").eq("id", 1).single();
    if (settingsError) throw settingsError;
    if (!settings.is_open) return reply(403, { error: "التقديم مغلق حاليًا." });

    const { data: questions, error: qError } = await client.from("application_questions")
      .select("id,label,input_type,required").eq("active", true);
    if (qError) throw qError;

    const cleanAnswers = {};
    for (const q of questions) {
      const value = String(answers[String(q.id)] ?? "").trim().slice(0, 4000);
      if (q.required && !value) return reply(400, { error: `السؤال مطلوب: ${q.label}` });
      cleanAnswers[String(q.id)] = value;
    }

    // Simple duplicate throttle by Discord ID when supplied; database still validates all inputs.
    if (discordId) {
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing, error: dupError } = await client.from("applications")
        .select("id").eq("applicant_discord_id", discordId).gte("created_at", since)
        .limit(1);
      if (dupError) throw dupError;
      if (existing?.length) return reply(409, { error: "يوجد طلب حديث لهذا الحساب. تواصل مع الإدارة إذا كنت تحتاج إلى تحديثه." });
    }

    const { error } = await client.from("applications").insert({
      applicant_discord_id: discordId,
      applicant_discord_name: name,
      answers: cleanAnswers
    });
    if (error) throw error;
    return reply(201, { ok: true, message: "تم استلام طلبك بنجاح." });
  } catch {
    return reply(500, { error: "تعذر حفظ الطلب الآن. حاول لاحقًا." });
  }
}
