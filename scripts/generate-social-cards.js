import { launch } from "puppeteer";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const socialCardDir = path.join(rootDir, "img", "socialcard");
const blogDir = path.join(rootDir, "blog");

async function getPostsFromBlogDir() {
  const files = await readdir(blogDir);
  const posts = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const slug = file.replace(".md", "");
    const content = await readFile(path.join(blogDir, file), "utf8");
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const hasSocialCard = /^social_card:/m.test(content);

    if (titleMatch) {
      // Handle multi-line titles (remove quotes if present)
      let title = titleMatch[1].trim();
      if (title.startsWith('"') || title.startsWith("'")) {
        title = title.slice(1, -1);
      }
      posts.push({ slug, title, hasSocialCard });
    }
  }

  return posts;
}

async function addSocialCardToFrontmatter(slug) {
  const filePath = path.join(blogDir, `${slug}.md`);
  const content = await readFile(filePath, "utf8");

  // Find the closing --- of frontmatter and insert social_card before it
  const updated = content.replace(
    /^(---\n[\s\S]*?)(---)/m,
    `$1social_card: ${slug}.jpg\n$2`,
  );

  await writeFile(filePath, updated, "utf8");
  console.log(`  Added social_card to ${slug}.md`);
}

async function generateCard(page, type, headshot, options = {}) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-accent: oklch(0.65 0.15 165);
      --color-primary-400: oklch(0.70 0.15 165);
      --color-primary-500: oklch(0.65 0.15 165);
      --color-white: oklch(0.98 0.01 80);
      --color-text-secondary: oklch(0.78 0.02 80);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 1200px;
      height: 630px;
      font-family: "Noto Sans", sans-serif;
      overflow: hidden;
    }

    .card {
      width: 1200px;
      height: 630px;
      background:
        radial-gradient(ellipse at 80% 35%, oklch(0.40 0.14 165 / 0.5) 0%, transparent 70%),
        radial-gradient(ellipse at 10% 90%, oklch(0.30 0.08 165 / 0.25) 0%, transparent 60%),
        linear-gradient(160deg, oklch(0.14 0.04 165) 0%, oklch(0.07 0.02 165) 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 60px 80px;
      color: var(--color-white);
    }

    .content {
      flex: 1;
      max-width: 700px;
    }

    .greeting {
      font-size: 1.25rem;
      font-style: italic;
      font-weight: 500;
      color: var(--color-primary-400);
      margin-bottom: 8px;
    }

    .name {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .tagline {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-primary-400);
      margin-bottom: 24px;
    }

    .url {
      font-size: 1.25rem;
      color: var(--color-text-secondary);
    }

    .card.post {
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      padding: 0;
    }

    .card.post .glass-card {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 50px 80px;
      width: 1200px;
      display: flex;
      align-items: center;
      flex: 1;
      margin-top: 60px;
    }

    .card.post .post-title {
      font-size: clamp(3rem, 8vw, 6rem);
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: -0.03em;
      margin: 0;
      text-align: left;
      text-wrap: balance;
    }

    .card.post .post-footer {
      padding: 36px 80px 40px;
      display: flex;
      align-items: center;
      gap: 20px;
      flex-shrink: 0;
    }

    .card.post .author-image {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      object-fit: cover;
      outline: 3px solid var(--color-primary-500);
      outline-offset: 3px;
    }

    .card.post .author-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .card.post .author-name {
      font-weight: 600;
      font-size: 1.35rem;
      color: var(--color-white);
    }

    .card.post .author-url {
      font-size: 1.15rem;
      color: var(--color-text-secondary);
    }

    .headshot-container {
      flex-shrink: 0;
    }

    .headshot {
      width: 280px;
      height: 280px;
      border-radius: 50%;
      object-fit: cover;
      outline: 10px solid var(--color-primary-500);
      outline-offset: 6px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
  </style>
</head>
<body>
  ${type === "home"
      ? `
  <div class="card home">
    <div class="content">
      <p class="greeting">Hello, I'm</p>
      <h1 class="name">Phil Parsons.</h1>
      <p class="tagline">Principal Engineer & Web Developer</p>
      <p class="url">philparsons.co.uk</p>
    </div>
    <div class="headshot-container">
      <img src="${headshot}" alt="" class="headshot">
    </div>
  </div>
  `
      : `
  <div class="card post">
    <div class="glass-card">
      <h1 class="post-title">${options.title}</h1>
    </div>
    <div class="post-footer">
      <img src="${headshot}" alt="" class="author-image">
      <div class="author-info">
        <span class="author-name">Phil Parsons</span>
        <span class="author-url">philparsons.co.uk</span>
      </div>
    </div>
  </div>
  `
    }
</body>
</html>`;

  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.evaluateHandle("document.fonts.ready");
}

const args = process.argv.slice(2);
const generateAll = args.includes("--all");
const specificSlug = args.find((arg) => !arg.startsWith("--"));

const browser = await launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();

// Load headshot as base64
const headshotPath = path.join(rootDir, "img", "headshot.jpeg");
const headshotBuffer = await readFile(headshotPath);
const headshot = `data:image/jpeg;base64,${headshotBuffer.toString("base64")}`;

// Generate home card
console.log("Generating home.jpg...");
await generateCard(page, "home", headshot);
await page.screenshot({
  path: path.join(socialCardDir, "home.jpg"),
  type: "jpeg",
  quality: 90,
});

// Get all posts
const posts = await getPostsFromBlogDir();

if (specificSlug) {
  // Generate for specific post
  const post = posts.find((p) => p.slug === specificSlug);
  if (post) {
    console.log(`Generating ${post.slug}.jpg...`);
    await generateCard(page, "post", headshot, { title: post.title });
    await page.screenshot({
      path: path.join(socialCardDir, `${post.slug}.jpg`),
      type: "jpeg",
      quality: 90,
    });
    if (!post.hasSocialCard) {
      await addSocialCardToFrontmatter(post.slug);
    }
  } else {
    console.error(`Post not found: ${specificSlug}`);
  }
} else if (generateAll) {
  // Generate for all posts
  for (const post of posts) {
    console.log(`Generating ${post.slug}.jpg...`);
    await generateCard(page, "post", headshot, { title: post.title });
    await page.screenshot({
      path: path.join(socialCardDir, `${post.slug}.jpg`),
      type: "jpeg",
      quality: 90,
    });
    if (!post.hasSocialCard) {
      await addSocialCardToFrontmatter(post.slug);
    }
  }
} else {
  console.log("Use --all to generate all post cards, or specify a slug");
}

await browser.close();
console.log("Done!");
