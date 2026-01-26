/**
 * GitHub Projects Data
 * Fetches repository statistics from GitHub API
 * Falls back to cached data if API is unavailable
 */

const GITHUB_API = "https://api.github.com";
const USERNAME = "p-m-p";

// Project definitions with repository names and descriptions
const projectDefinitions = [
  {
    repo: "slider",
    title: "@boxslider",
    description:
      "A zero-dependency, lightweight content slider with multiple transition effects for modern browsers.",
  },
  {
    repo: "parsonic",
    title: "@parsonic",
    description:
      "Standalone web components for common website patterns including copy-to-clipboard, share buttons, and theme switching.",
  },
];

// Fallback data in case GitHub API is unavailable
const fallbackData = [
  {
    "repo": "slider",
    "title": "@boxslider",
    "description": "A zero-dependency, lightweight content slider with multiple transition effects for modern browsers.",
    "stars": 890,
    "forks": 234,
    "url": "https://github.com/p-m-p/slider"
  },
  {
    "repo": "parsonic",
    "title": "@parsonic",
    "description": "Standalone web components for common website patterns including copy-to-clipboard, share buttons, and theme switching.",
    "stars": 4,
    "forks": 0,
    "url": "https://github.com/p-m-p/parsonic"
  }
];

/**
 * Fetch repository data from GitHub API
 */
async function fetchRepoData(repo) {
  const url = `${GITHUB_API}/repos/${USERNAME}/${repo}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        // Use token if available (for higher rate limits)
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      url: data.html_url,
    };
  } catch (error) {
    console.warn(`Failed to fetch data for ${repo}:`, error.message);
  }
}

/**
 * Fetch all project data
 */
async function fetchAllProjects() {
  const projects = await Promise.all(
    projectDefinitions.map(async (project) => {
      const repoData = await fetchRepoData(project.repo);

      if (repoData === undefined) {
        // Use fallback data if fetch failed
        const fallback = fallbackData.find((p) => p.repo === project.repo);
        return {
          ...project,
          url: `https://github.com/${USERNAME}/${project.repo}`,
          stars: fallback?.stars || 0,
          forks: fallback?.forks || 0,
        };
      }

      return {
        ...project,
        ...repoData,
      };
    }),
  );

  return projects;
}

async function getProjects() {
  try {
    return await fetchAllProjects();
  } catch (error) {
    console.warn("Failed to fetch projects data, using fallback:", error);
    return fallbackData;
  }
}

export default getProjects;
