'use strict';
// Keep incoming links to the former research page usable on the single-page site.
const destination = new URL('index.html', window.location.href);
destination.hash = window.location.hash || '#idea';
window.location.replace(destination.href);
