import { I18nManager } from 'react-native';

/**
 * Forces the native layout direction to RTL (right-to-left) so React Native's
 * flexbox engine mirrors flex-row layouts, icon/text ordering, and default text
 * alignment to match Arabic reading direction throughout the app.
 *
 * This must run synchronously at module load (before any component renders) —
 * NOT inside a useEffect, and NOT awaited — because I18nManager reads/writes a
 * native flag that Yoga consults very early in the render pipeline.
 *
 * Important limitation (not fixable from JS): I18nManager.forceRTL only takes
 * effect on the NEXT full app restart — it cannot repaint the current session's
 * native layout tree. The native setting persists across launches once set, so
 * this is only ever a no-op after the very first launch post-update.
 *
 * Returns true exactly once — the first launch where RTL was off and this call
 * just switched it on — so the caller can show a "please restart the app" notice
 * for that one session only.
 */
export function applyRTLAndCheckIfJustEnabled(): boolean {
  const wasAlreadyRTL = I18nManager.isRTL;
  if (!wasAlreadyRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
  return !wasAlreadyRTL;
}


