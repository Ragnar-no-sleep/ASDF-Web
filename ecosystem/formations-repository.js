/**
 * Formations Repository - Learning Paths
 * Lazy-loaded educational content modules
 *
 * Usage:
 * import { getFormation, getPath, getFormations } from './formations-repository.js';
 *
 * @author CYNIC
 */

let formationsCache = null;

/**
 * Load formations data (only once, on first use)
 * @private
 */
async function loadFormations() {
  if (formationsCache) return formationsCache;

  try {
    const { formations } = await import('./data/formations.json', { assert: { type: 'json' } });
    formationsCache = formations;
    return formations;
  } catch (err) {
    console.error('[FormationsRepository] Failed to load formations:', err.message);
    return [];
  }
}

/**
 * Get single formation by ID
 * @param {string} id - Formation ID
 * @returns {Promise<Object|null>} Formation or null
 */
export async function getFormation(id) {
  const formations = await loadFormations();
  return formations.find((f) => f.id === id) || null;
}

/**
 * Get all formations
 * @returns {Promise<Array>} All formations
 */
export async function getFormations() {
  return loadFormations();
}

/**
 * Get learning path (sequence of formations)
 * @param {string} startId - Starting formation ID
 * @returns {Promise<{path: Array, next: string|null}>}
 */
export async function getPath(startId) {
  const formations = await loadFormations();
  const path = [];
  let current = formations.find((f) => f.id === startId);

  while (current) {
    path.push({
      id: current.id,
      title: current.title,
      difficulty: current.difficulty,
      duration: current.duration,
      description: current.description,
    });

    // Find next formation
    current = formations.find((f) => f.id === current.next_id);
  }

  const nextFormation = formations.find((f) => f.id === current?.next_id);

  return {
    path,
    next: nextFormation ? { id: nextFormation.id, title: nextFormation.title } : null,
  };
}

/**
 * Get formations by difficulty
 * @param {string} level - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Promise<Array>}
 */
export async function getByDifficulty(level) {
  const formations = await loadFormations();
  return formations.filter((f) => f.difficulty === level);
}

/**
 * Get prerequisites for a formation
 * @param {string} id - Formation ID
 * @returns {Promise<Array|null>} Prerequisite formations
 */
export async function getPrerequisites(id) {
  const formations = await loadFormations();
  const formation = formations.find((f) => f.id === id);

  if (!formation || !formation.prerequisites) return [];

  return formation.prerequisites
    .map((pid) => formations.find((f) => f.id === pid))
    .filter(Boolean);
}

/**
 * Get recommended formations after completion
 * @param {string} id - Completed formation ID
 * @returns {Promise<Array>} Recommended next formations
 */
export async function getRecommendations(id) {
  const formations = await loadFormations();
  const completed = formations.find((f) => f.id === id);

  if (!completed) return [];

  return formations
    .filter((f) =>
      // Find formations at similar difficulty
      f.difficulty === completed.difficulty &&
      // Skip current formation
      f.id !== id &&
      // Optionally: has completed as prerequisite
      (!f.prerequisites || f.prerequisites.includes(id))
    )
    .slice(0, 5);
}

/**
 * Search formations by keyword
 * @param {string} query - Search term
 * @returns {Promise<Array>}
 */
export async function search(query) {
  const formations = await loadFormations();
  const term = query.toLowerCase();

  return formations.filter(
    (f) =>
      f.title.toLowerCase().includes(term) ||
      f.description.toLowerCase().includes(term) ||
      (f.tags && f.tags.some((tag) => tag.toLowerCase().includes(term)))
  );
}

/**
 * Get all tags used in formations
 * @returns {Promise<Array>}
 */
export async function getAllTags() {
  const formations = await loadFormations();
  const tags = new Set();

  formations.forEach((f) => {
    if (f.tags) {
      f.tags.forEach((tag) => tags.add(tag));
    }
  });

  return Array.from(tags).sort();
}

/**
 * Get formations by tag
 * @param {string} tag - Tag name
 * @returns {Promise<Array>}
 */
export async function getByTag(tag) {
  const formations = await loadFormations();
  return formations.filter((f) => f.tags && f.tags.includes(tag));
}
