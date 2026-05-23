import type { Post, Profile } from "@db/schema";

export interface PostWithProfile {
  post: Post;
  profile: Profile | undefined;
  isBusiness?: boolean;
  images?: string[];
}
