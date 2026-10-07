import {resolveAnchor} from './anchors.mjs';
// Keep incoming links to the former research page usable on the single-page site.
const destination = new URL('index.html', window.location.href);
destination.hash = resolveAnchor(window.location.hash) || 'method';
window.location.replace(destination.href);
