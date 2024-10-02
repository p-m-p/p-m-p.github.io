import { feedPlugin } from "@11ty/eleventy-plugin-rss";

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addBundle("css");

  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
      return false;
    }
  });

  eleventyConfig.addPassthroughCopy("./pretty-atom-feed.xsl");
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed/feed.xml",
    stylesheet: "/pretty-atom-feed.xsl",
    collection: {
      name: "posts",
      limit: 10,
    },
    metadata: {
      language: "en",
      title: "Phil Parsons",
      subtitle: "Web developer and bike enthusiast from London, UK",
      base: "https://philparsons.co.uk/",
      author: {
        name: "Phil Parsons",
      },
    },
  });
}
