import { GetServerSideProps } from "next";
import { generateQuery } from "../common/postQuery";
import { getPostBasePathByType } from "../common/types";
import { IPost, db } from "../server/mysql";
import sspLoadDB from "../common/sspLoadDB";

async function getPosts() {
  const [posts] = await db.execute<IPost[]>(
    generateQuery(
      ["p.postId", "p.postType", "p.lastEdit", "p.posted", "p.title"],
      false,
      false,
      false,
      false,
      false
    )
  );

  return posts;
}

async function generateSiteMap(baseURL: string) {
  const posts = await getPosts();

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${posts.map(
    (post) => `<url>
    <loc>${baseURL}/${getPostBasePathByType(post.postType)}/${
      post.postId
    }/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}</loc>
    <lastmod>${(post.lastEdit || post.posted).toISOString()}</lastmod>
  </url>`
  )}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  await sspLoadDB();
  const sitemap = await generateSiteMap(`http://${req.headers.host}`);

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return {
    props: {}
  };
};

export default function SiteMap() {}
