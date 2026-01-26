/**
 * GitHub Projects Configuration
 * Shared configuration and functions for fetching project data
 */

export const GITHUB_API = "https://api.github.com";
export const USERNAME = "p-m-p";

// Project definitions with repository names and descriptions
export const projectDefinitions = [
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

/**
 * Fetch repository data from GitHub API
 */
export async function fetchRepoData(repo) {
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
