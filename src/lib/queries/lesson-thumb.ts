import { sql } from "drizzle-orm";
import { lessons } from "@/db/schema";

/**
 * Cover image of a lesson: the uploaded cover if there is one, otherwise (for YouTube lessons)
 * YouTube's own thumbnail of that video (never for VIP lessons: the thumbnail URL would reveal the video id), otherwise null (the card then shows its default artwork).
 */
export const lessonThumbnail = sql<string | null>`coalesce(${lessons.thumbnailUrl}, case when not ${lessons.isVip} and ${lessons.provider} = 'youtube' and ${lessons.videoRef} ~ '^[A-Za-z0-9_-]{11}$' then 'https://i.ytimg.com/vi/' || ${lessons.videoRef} || '/hqdefault.jpg' end)`;
