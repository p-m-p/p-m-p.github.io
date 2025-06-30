# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm run dev` - Start development server with live reload
- `pnpm run build` - Build the site for production (runs clean first)
- `pnpm run clean` - Remove the `_site` directory
- `pnpm run format` - Format code with Prettier

## Architecture

This is an Eleventy (11ty) static site generator blog built with:

- **Content**: Markdown blog posts in `/blog/` directory
- **Templates**: Nunjucks templates in `/_includes/layouts/`
- **Data**: Global data files in `/_data/` with Zod schema validation
- **Assets**: CSS in `/css/`, JavaScript in `/js/`, images in `/img/`
- **Output**: Generated site in `/_site/` directory

### Key Files

- `.eleventy.js` - Main Eleventy configuration with plugins and filters
- `_data/eleventyDataSchema.js` - Zod validation for frontmatter data
- `blog/blog.11tydata.js` - Directory data for blog posts (sets layout and tags)

### Content Structure

- Blog posts use `layouts/post.njk` layout and are tagged as "posts"
- Posts support `draft: true` frontmatter (excluded from builds)
- Image optimization is automatic via eleventy-img plugin
- Syntax highlighting with copy-to-clipboard functionality

### Plugins Used

- `@11ty/eleventy-img` - Image optimization
- `@11ty/eleventy-plugin-rss` - RSS/Atom feed generation
- `@11ty/eleventy-plugin-syntaxhighlight` - Code syntax highlighting

## Package Manager

This project uses `pnpm` as specified in the packageManager field.