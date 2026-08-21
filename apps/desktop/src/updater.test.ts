import { describe, expect, it } from "vitest";

import { UPDATE_POLICY } from "./updater";

describe("LudusAtlas update policy", () => {
  it("cannot contact or install from a release feed until one is explicitly configured", () => {
    expect(UPDATE_POLICY).toEqual({
      automaticChecksEnabled: false,
      manualChecksEnabled: false,
      releaseFeedConfigured: false,
      message:
        "Updates are disabled in this development build until LudusAtlas has its own signed release feed.",
    });
  });
});
