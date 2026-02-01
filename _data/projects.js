/**
 * GitHub Projects Data
 * Fetches repository statistics from GitHub API
 * Falls back to cached data if API is unavailable
 */

// Import shared configuration and functions
import {
  USERNAME,
  projectDefinitions,
  fetchRepoData,
} from "./projects-config.js";

// Fallback data in case GitHub API is unavailable
const fallbackData = [
  {
    "repo": "slider",
    "title": "@boxslider",
    "description": "A zero-dependency, lightweight content slider with multiple transition effects for modern browsers.",
    "stars": 889,
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
