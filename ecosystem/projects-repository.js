/**
 * Projects Repository - Lazy-loaded from ecosystem data
 * Replaces monolithic ecosystem-data.js
 *
 * Usage:
 * import { getProject, getProjects, searchProjects } from './projects-repository.js';
 *
 * @author CYNIC
 */

// Only load projects when this module is imported (lazy)
let projectsCache = null;

/**
 * Load projects data (only once)
 * @private
 */
async function loadProjects() {
  if (projectsCache) return projectsCache;

  // In production, this could come from:
  // 1. Database (async import from DB)
  // 2. JSON file (fs.readFile)
  // 3. API endpoint (fetch from external service)
  // For now, imported from file, but only when needed

  try {
    const { projects } = await import('./data/projects.json', { assert: { type: 'json' } });
    projectsCache = projects;
    return projects;
  } catch (err) {
    console.error('[ProjectsRepository] Failed to load projects:', err.message);
    return [];
  }
}

/**
 * Get single project by ID
 * @param {string} id - Project ID
 * @returns {Promise<Object|null>} Project or null if not found
 */
export async function getProject(id) {
  const projects = await loadProjects();
  return projects.find((p) => p.id === id) || null;
}

/**
 * Get all projects (paginated)
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {string} category - Optional category filter
 * @returns {Promise<{total, pages, page, limit, data}>}
 */
export async function getProjects(page = 1, limit = 50, category = null) {
  const projects = await loadProjects();

  let filtered = projects;

  // Filter by category
  if (category) {
    filtered = projects.filter((p) => p.category === category);
  }

  const total = filtered.length;
  const pages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = filtered.slice(offset, offset + limit);

  return {
    total,
    pages,
    page,
    limit,
    data,
  };
}

/**
 * Search projects by term
 * @param {string} query - Search term
 * @returns {Promise<Array>} Matching projects
 */
export async function searchProjects(query) {
  const projects = await loadProjects();
  const term = query.toLowerCase();

  return projects.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
  );
}

/**
 * Get all categories
 * @returns {Promise<Array>} Unique categories
 */
export async function getCategories() {
  const projects = await loadProjects();
  const categories = new Set(projects.map((p) => p.category));
  return Array.from(categories).sort();
}

/**
 * Get projects by category
 * @param {string} category - Category name
 * @returns {Promise<Array>} Projects in category
 */
export async function getProjectsByCategory(category) {
  const projects = await loadProjects();
  return projects.filter((p) => p.category === category);
}

/**
 * Get trending projects
 * @returns {Promise<Array>} Top 10 trending projects
 */
export async function getTrendingProjects() {
  const projects = await loadProjects();
  return projects
    .sort((a, b) => (b.contributors || 0) - (a.contributors || 0))
    .slice(0, 10);
}
