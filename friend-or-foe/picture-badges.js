export const shapes = ['star', 'heart', 'circle', 'square', 'triangle'];

export function pictureBadge(shape) {
  const badge = document.createElement('i');
  badge.className = 'picture-badge shape-' + shape;
  badge.setAttribute('aria-hidden', 'true');
  return badge;
}
