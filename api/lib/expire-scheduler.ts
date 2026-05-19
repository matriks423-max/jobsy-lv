import { expireOldPosts } from "../queries/posts";

let lastRunAt = 0;
const INTERVAL_MS = 60 * 60 * 1000; // run at most once per hour

export async function maybeExpirePosts() {
  const now = Date.now();
  if (now - lastRunAt < INTERVAL_MS) return;
  lastRunAt = now;
  await expireOldPosts();
}
