import { generateSchema } from "@/lib/schemas";
import { generateCaptions } from "@/lib/server/gemini";
import { json, rateLimit, withUser } from "@/lib/server/http";

export const POST = withUser(async (user, req) => {
  rateLimit(`captions:${user.uid}`, 10, 60_000);
  const { prompt, platform, tone } = generateSchema.parse(await req.json());
  return json({ captions: await generateCaptions(prompt, platform, tone) });
});
