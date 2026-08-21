/**
 * LudusAtlas intentionally ships without an update feed during fork
 * development. Keeping this policy in a small module makes the safety boundary
 * explicit and gives a future, separately signed LudusAtlas release pipeline a
 * single integration point.
 */
export const UPDATE_POLICY = {
  automaticChecksEnabled: false,
  manualChecksEnabled: false,
  releaseFeedConfigured: false,
  message:
    "Updates are disabled in this development build until LudusAtlas has its own signed release feed.",
} as const;
