export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addBundle("css");
}
