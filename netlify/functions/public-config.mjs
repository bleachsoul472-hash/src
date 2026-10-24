import { db, reply } from "./_shared.mjs";

export async function handler() {
  try {
    const client = db();
    const [{ data: settings, error: settingsError }, { data: questions, error: questionsError }] =
      await Promise.all([
        client.from("application_settings").select("is_open").eq("id", 1).single(),
        client.from("application_questions").select("id,label,input_type,required,position")
          .eq("active", true).order("position", { ascending: true })
      ]);
    if (settingsError || questionsError) throw settingsError || questionsError;
    return reply(200, { isOpen: settings.is_open, questions });
  } catch (e) {
    return reply(500, { error: "تعذر تحميل التقديمات. تأكد من إعداد قاعدة البيانات." });
  }
}
