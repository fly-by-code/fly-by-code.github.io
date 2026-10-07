// Bookmarked destinations from the former single-page tabs/research page.
// Removed film sections now lead to Method; the old media files remain intact.
export const legacyAnchors = Object.freeze({
  video: 'method', 'research-film-title': 'method', 'research-video': 'method',
  'full-research-film': 'method', 'full-research-video': 'method', 'film-music-credit': 'method',
  idea: 'method', feedback: 'method', 'in-flight': 'real-world',
  'cabinet-tab': 'cabinet-demo', 'tools-tab': 'tools-demo',
  'task-success-tab': 'task-success', 'generality-tab': 'generality',
  'completion-tab': 'completion', research: 'abstract'
});

export function resolveAnchor(hash) {
  let id;
  try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return ''; }
  return Object.hasOwn(legacyAnchors, id) ? legacyAnchors[id] : id;
}
