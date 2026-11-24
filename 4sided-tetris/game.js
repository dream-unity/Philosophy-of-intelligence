// Older cached game pages still request this entry point.
document.getElementById('spin')?.remove();
const gameScript = document.createElement('script');
gameScript.src = new URL('gameplay.js', document.currentScript.src).href;
document.head.append(gameScript);
