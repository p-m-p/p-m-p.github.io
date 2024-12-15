import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { DateTime } from "luxon";

export default function(eleventyConfig) {
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

  eleventyConfig.addBundle("css");
  eleventyConfig.addWatchTarget("css");

  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addWatchTarget("js");

  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
  });

  eleventyConfig.addFilter("urlencode", (value) => {
    return encodeURIComponent(value);
  });

  eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
    // Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
    return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(
      format || "dd LLLL yyyy",
    );
  });

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
}
