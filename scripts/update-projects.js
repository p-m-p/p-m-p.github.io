#!/usr/bin/env node

/**
 * Update GitHub Projects Data
 * Fetches current repository statistics from GitHub API and updates _data/projects.js
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  projectDefinitions,
  fetchRepoData,
} from "../_data/projects-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fetch all project data with live stats
 */
async function fetchAllProjects() {
  const projects = await Promise.all(
    projectDefinitions.map(async (project) => {
      const repoData = await fetchRepoData(project.repo);
      
      if (!repoData) {
        throw new Error(`Failed to fetch data for ${project.repo}`);
      }
      
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
    // Match the fallbackData array structure specifically
    const fallbackDataRegex = /const fallbackData = \[\s*\{[\s\S]*?\}\s*\];/;

    if (!fallbackDataRegex.test(currentContent)) {
      throw new Error(
        "Could not find fallbackData array in projects.js. File structure may have changed.",
      );
    }

    const updatedContent = currentContent.replace(
      fallbackDataRegex,
      `export const fallbackData = ${fallbackDataString};`,
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
