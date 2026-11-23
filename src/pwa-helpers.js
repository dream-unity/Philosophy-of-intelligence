'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PoiPwaHelpers = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const EXCLUDED_PATTERNS = [
    /^\/(?:common-earth|zelda-and-the-princess-zombie)(?:\/|$)/i,
    /^\/(?:server\.js|package(?:-lock)?\.json|metadata\.json)$/i
  ];

  function normalizePathname(rawPath) {
    if (typeof rawPath !== 'string' || !rawPath.trim()) return '/';
    const stripped = rawPath.trim().split(/[?#]/, 1)[0];
    return stripped.startsWith('/') ? stripped : '/' + stripped;
  }

  function isExcludedFromPwaPath(pathname) {
    const normalized = normalizePathname(pathname);
    return EXCLUDED_PATTERNS.some(pattern => pattern.test(normalized));
  }

  function shouldCacheRequest({ method = 'GET', origin = '', currentOrigin = '', pathname = '/' } = {}) {
    if (String(method).toUpperCase() !== 'GET') return false;
    if (!origin || !currentOrigin || origin !== currentOrigin) return false;
    const normalized = normalizePathname(pathname);
    if (isExcludedFromPwaPath(normalized)) return false;
    if (/^\/dist(?:\/|$)/i.test(normalized)) return false;
    return true;
  }

  function isNavigationFallbackAllowed({ mode = '', origin = '', currentOrigin = '', pathname = '/' } = {}) {
    if (mode !== 'navigate') return false;
    if (!origin || !currentOrigin || origin !== currentOrigin) return false;
    return !isExcludedFromPwaPath(pathname);
  }

  function detectInstallPlatform({ userAgent = '', maxTouchPoints = 0, isStandalone = false } = {}) {
    if (isStandalone) return 'standalone';
    const ua = String(userAgent || '');
    const isIosDevice = /iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && Number(maxTouchPoints) > 1);
    if (isIosDevice) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  function shouldShowDownloadButton({ isStandalone = false } = {}) {
    return !isStandalone;
  }

  function shouldShowMusicPlayer({ isStandalone = false, isOnline = true } = {}) {
    return !isStandalone && isOnline !== false;
  }

  function getInstallButtonState({ isStandalone = false, hasDeferredPrompt = false, platform = 'desktop' } = {}) {
    const resolvedPlatform = isStandalone ? 'standalone' : platform;
    return {
      visible: shouldShowDownloadButton({ isStandalone }),
      action: hasDeferredPrompt ? 'prompt' : 'guide',
      label: 'Download app',
      platform: resolvedPlatform
    };
  }

  function validateManifest(manifest) {
    const errors = [];
    if (!manifest || typeof manifest !== 'object') {
      return { valid: false, errors: ['Manifest must be a JSON object.'] };
    }
    const serialized = JSON.stringify(manifest).toLowerCase();
    if (serialized.includes('common-earth')) {
      errors.push('Manifest must not reference common-earth.');
    }
    if (typeof manifest.id !== 'string' || !manifest.id.trim()) errors.push('Missing manifest id.');
    if (typeof manifest.name !== 'string' || !manifest.name.trim()) errors.push('Missing manifest name.');
    if (typeof manifest.short_name !== 'string' || !manifest.short_name.trim()) {
      errors.push('Missing manifest short_name.');
    } else if (manifest.short_name.length > 12) {
      errors.push(`short_name "${manifest.short_name}" exceeds 12 characters.`);
    }
    if (typeof manifest.start_url !== 'string' || !manifest.start_url.trim()) errors.push('Missing start_url.');
    if (typeof manifest.scope !== 'string' || !manifest.scope.trim()) errors.push('Missing scope.');
    if (!['standalone', 'minimal-ui', 'fullscreen'].includes(manifest.display)) {
      errors.push('Invalid display mode.');
    }
    if (typeof manifest.theme_color !== 'string' || !manifest.theme_color.trim()) errors.push('Missing theme_color.');
    if (typeof manifest.background_color !== 'string' || !manifest.background_color.trim()) errors.push('Missing background_color.');

    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    const has192Any = icons.some(icon => icon && icon.type === 'image/png' && String(icon.sizes).includes('192x192') && icon.purpose === 'any');
    const has512Any = icons.some(icon => icon && icon.type === 'image/png' && String(icon.sizes).includes('512x512') && icon.purpose === 'any');
    const has512Maskable = icons.some(icon => icon && icon.type === 'image/png' && String(icon.sizes).includes('512x512') && icon.purpose === 'maskable');
    const hasCombinedPurpose = icons.some(icon => icon && /\bany\b/.test(String(icon.purpose || '')) && /\bmaskable\b/.test(String(icon.purpose || '')));

    if (!has192Any) errors.push('Missing 192x192 PNG icon with purpose "any".');
    if (!has512Any) errors.push('Missing 512x512 PNG icon with purpose "any".');
    if (!has512Maskable) errors.push('Missing 512x512 PNG icon with purpose "maskable".');
    if (hasCombinedPurpose) errors.push('Icons must not combine "any" and "maskable" purposes.');

    return { valid: errors.length === 0, errors };
  }

  return {
    normalizePathname,
    isExcludedFromPwaPath,
    shouldCacheRequest,
    isNavigationFallbackAllowed,
    detectInstallPlatform,
    shouldShowDownloadButton,
    shouldShowMusicPlayer,
    getInstallButtonState,
    validateManifest
  };
});
