import { createRouter, publicQuery } from "./middleware";
import { countActivePosts, countPostsByType, countUsers, countCategories } from "./queries/posts";

export const statsRouter = createRouter({
  get: publicQuery.query(async () => {
    const [activePosts, needPosts, offerPosts, users, categories] = await Promise.all([
      countActivePosts(),
      countPostsByType("need"),
      countPostsByType("offer"),
      countUsers(),
      countCategories(),
    ]);
    return {
      activePosts: Number(activePosts),
      needPosts: Number(needPosts),
      offerPosts: Number(offerPosts),
      users: Number(users),
      categories: Number(categories),
    };
  }),
});
