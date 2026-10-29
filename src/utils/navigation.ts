type BackRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/tabs') => void;
};

/** Avoid a blank stack after delete/save when there is no history. */
export function safeBack(router: BackRouter, fallback: '/tabs' = '/tabs') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
