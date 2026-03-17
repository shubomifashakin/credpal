export function makeFxRateFreshCacheKey(currency: string) {
  return `fx:rate:${currency}:fresh`;
}

export function makeFxRateStaleCacheKey(currency: string) {
  return `fx:rate:${currency}:stale`;
}
