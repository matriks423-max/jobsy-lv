import { env } from "./env";

export function notifySocialQueue(
  postId: number,
  title: string,
  description: string | null,
  category: string,
  city: string | null
): void {
  const webhookUrl = env.n8nWebhookUrl;
  if (!webhookUrl) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, title, description, category, city }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}

export function notifyReview(
  stars: number,
  category: string,
  city: string | null
): void {
  const webhookUrl = env.n8nReviewWebhookUrl;
  if (!webhookUrl || stars < 5) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stars, category, city }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}
