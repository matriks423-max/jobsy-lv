import { createRouter, publicQuery } from "./middleware";
import { countActivePosts, countPostsByType } from "./queries/posts";

export const statsRouter = createRouter({
  get: publicQuery.query(async () => {
    const activePosts = await countActivePosts();
    const needPosts = await countPostsByType("need");
    const offerPosts = await countPostsByType("offer");
    return {
      activePosts,
      needPosts,
      offerPosts,
      cities: 8,
      categories: 10,
    };
  }),
});
