import { z } from "zod";

export const PLATFORMS = ["instagram", "x", "linkedin", "facebook", "tiktok"] as const;
export const TONES = ["friendly", "professional", "witty", "inspiring", "bold"] as const;
export const LEAD_OPTIONS = [
  { value: 0, label: "At the scheduled time" },
  { value: 15, label: "15 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
] as const;

const hashtag = z
  .string()
  .trim()
  .regex(/^#?[\p{L}\p{N}_]{1,50}$/u, "Hashtags can only contain letters, numbers and _")
  .transform((t) => (t.startsWith("#") ? t : `#${t}`));

export const generateSchema = z.object({
  prompt: z.string().trim().min(3, "Describe your post in at least 3 characters.").max(500),
  platform: z.enum(PLATFORMS),
  tone: z.enum(TONES),
});

const scheduledAt = z.iso
  .datetime({ offset: true, message: "Pick a valid date and time." })
  .refine((v) => new Date(v).getTime() > Date.now() - 60_000, "Pick a time in the future.");

export const createPostSchema = z.object({
  prompt: z.string().trim().min(3).max(500),
  platform: z.enum(PLATFORMS),
  caption: z.string().trim().min(1, "Caption is empty.").max(2200),
  hashtags: z.array(hashtag).max(30),
  scheduledAt,
  notes: z.string().trim().max(1000).optional().default(""),
  imagePath: z.string().max(300).nullable().optional(),
});

export const updatePostSchema = z.object({
  caption: z.string().trim().min(1, "Caption is empty.").max(2200).optional(),
  hashtags: z.array(hashtag).max(30).optional(),
  scheduledAt: scheduledAt.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const settingsSchema = z.object({
  enabled: z.boolean(),
  email: z.email("Enter a valid email.").max(254),
  leadMinutes: z.union(LEAD_OPTIONS.map((o) => z.literal(o.value))),
  subjectPrefix: z.string().trim().min(1, "Subject prefix is required.").max(60),
  includeHashtags: z.boolean(),
  timezone: z
    .string()
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown timezone."),
});

export type Caption = { text: string; hashtags: string[] };

export type Post = {
  id: string;
  prompt: string;
  platform: (typeof PLATFORMS)[number];
  caption: string;
  hashtags: string[];
  scheduledAt: string;
  notes: string;
  imageUrl: string | null;
  driveFileId: string | null;
  status: "scheduled" | "notified";
  createdAt: string;
};

export type Settings = z.infer<typeof settingsSchema>;
