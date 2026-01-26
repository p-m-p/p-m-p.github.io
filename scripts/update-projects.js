#!/usr/bin/env node

/**
 * Update GitHub Projects Data
 * Fetches current repository statistics from GitHub API and updates _data/projects.js
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_API = "https://api.github.com";
const USERNAME = "p-m-p";

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

/**
 * Fetch repository data from GitHub API
 */
async function fetchRepoData(repo) {
  const url = `${GITHUB_API}/repos/${USERNAME}/${repo}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
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
    console.error(`Failed to fetch data for ${repo}:`, error.message);
    throw error;
  }
}

/**
 * Fetch all project data
 */
async function fetchAllProjects() {
  const projects = await Promise.all(
    projectDefinitions.map(async (project) => {
      const repoData = await fetchRepoData(project.repo);
      return {
        ...project,
        ...repoData,
      };
    }),
  );

  return projects;
}

/**
 * Update the projects.js data file
 */
async function updateProjectsData() {
  try {
    console.log("Fetching GitHub repository data...");
    const projects = await fetchAllProjects();

    console.log("Fetched data:");
    for (const project of projects) {
      console.log(
        `  ${project.title}: ${project.stars} stars, ${project.forks} forks`,
      );
    }

    // Read the current projects.js file
    const projectsPath = path.join(__dirname, "..", "_data", "projects.js");
    const currentContent = await readFile(projectsPath, "utf8");

    // Update the fallback data in the file
    const fallbackDataString = JSON.stringify(projects, undefined, 2);

    // Replace the fallbackData array in the file
    const updatedContent = currentContent.replace(
      /const fallbackData = \[[\s\S]*?\];/,
      `const fallbackData = ${fallbackDataString};`,
    );

    // Write the updated file
    await writeFile(projectsPath, updatedContent, "utf8");

    console.log("\n✓ Successfully updated _data/projects.js");
  } catch (error) {
    console.error("Error updating projects data:", error);
    process.exit(1);
  }
}

// Run the update
await updateProjectsData();
