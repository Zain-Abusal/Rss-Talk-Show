import { z } from "zod";
import { serviceClient } from "@/lib/supabase/server";
import { json, failure, readBody, requireOrigin, rateLimit } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    await rateLimit(request, "contact", 5, 600);
    const body = z
      .object({
        role: z.enum(["Speaker", "Teacher", "Student", "Parent"]),
        grade: z.number().int().min(1).max(12).nullable().optional(),
        name: z.string().trim().min(2).max(150),
        email: z.email().max(320),
        question: z.string().trim().min(10).max(4000),
      })
      .strict()
      .parse(await readBody(request));
    if (body.role === "Student" && !body.grade)
      throw new Error("REQUIRED_FIELD");
    if (body.role !== "Student") body.grade = null;
    const { error } = await serviceClient()
      .from("contact_messages")
      .insert(body);
    if (error) throw error;
    return json(
      { message: "Your question has been saved for the event team." },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
