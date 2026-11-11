import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { DateTime } from "luxon";

export default function eleventyConfig(eleventyConfig) {
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    extensions: "html",
    formats: ["webp", "jpeg"],
    // widths: ["auto"],
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
    },
  });
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy(".nojekyll");

  eleventyConfig.addBundle("css");
  eleventyConfig.addWatchTarget("css");

  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addWatchTarget("js");

  eleventyConfig.addFilter("htmlDateString", (dateObject) => {
    return DateTime.fromJSDate(dateObject, { zone: "utc" }).toFormat(
      "yyyy-LL-dd",
    );
  });

  eleventyConfig.addFilter("urlencode", (value) => {
    return encodeURIComponent(value);
  });

  eleventyConfig.addFilter("readableDate", (dateObject, format, zone) => {
    // Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
    return DateTime.fromJSDate(dateObject, { zone: zone || "utc" }).toFormat(
      format || "dd LLLL yyyy",
    );
  });

  eleventyConfig.addFilter("head", (array, n) => {
    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }
    return n < 0 ? array.slice(n) : array.slice(0, n);
  });

  eleventyConfig.addFilter("seriesPosts", (allPosts, seriesName) => {
    const parts = allPosts
      .filter((post) => post.data?.series?.name === seriesName)
      .toSorted((a, b) => a.data.series.part - b.data.series.part);

    const duplicate = parts.find(
      (post, index) =>
        index > 0 &&
        post.data.series.part === parts[index - 1].data.series.part,
    );
    if (duplicate) {
      throw new Error(
        `Series "${seriesName}" has more than one post marked as part ${duplicate.data.series.part}`,
      );
    }

    return parts;
  });

  eleventyConfig.addFilter("nextInSeries", (seriesPosts, currentUrl) => {
    const index = seriesPosts.findIndex((post) => post.url === currentUrl);
    return index === -1 ? undefined : seriesPosts[index + 1];
  });

  eleventyConfig.addFilter(
    "relatedPosts",
    (allPosts, currentUrl, currentTags, count, excludeSeries) => {
      const filteredTags = new Set(
        (currentTags || []).filter((tag) => tag !== "posts"),
      );
      return allPosts
        .filter((post) => post.url !== currentUrl)
        .filter(
          (post) => !excludeSeries || post.data?.series?.name !== excludeSeries,
        )
        .map((post) => {
          const postTags = ((post.data || {}).tags || []).filter(
            (tag) => tag !== "posts",
          );
          const matchCount = postTags.filter((tag) =>
            filteredTags.has(tag),
          ).length;
          return { post, matchCount };
        })
        .filter(({ matchCount }) => matchCount > 0)
        .toSorted((a, b) => b.matchCount - a.matchCount)
        .slice(0, count || 1)
        .map(({ post }) => post);
    },
  );

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

  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.amendLibrary("md", (mdLibrary) => {
    const defaultRender = mdLibrary.renderer.rules.fence;

    mdLibrary.renderer.rules.fence = function fence(...arguments_) {
      let html = defaultRender(...arguments_);

      html = `<copy-to-clipboard>${html.trim()}</copy-to-clipboard>\n`;

      return html;
    };
  });
}
