import { describe, expect, it } from "vitest";
import { cite, getCitations, getChunk, ruleFingerprint } from "./_kb.js";

describe("reviewed KB citations", () => {
  it("accepts unchanged reviewed text and records the pin and calling file", () => {
    const id = "comprehensive-0169";
    const fingerprint = ruleFingerprint(getChunk(id));
    expect(cite(id, "citation infrastructure compatibility", fingerprint)).toBe(getChunk(id));
    expect(getCitations().at(-1)).toMatchObject({
      id,
      fingerprint,
      file: expect.stringContaining("kb-citation-drift.test.ts"),
    });
  });

  it("rejects changed text under an existing positional ID before recording coverage", () => {
    const chunk = getChunk("comprehensive-0169");
    const previousText = chunk.text;
    const fingerprint = ruleFingerprint(chunk);
    const count = getCitations().length;
    try {
      chunk.text = `${previousText}\nChanged normative obligation.`;
      expect(() => cite(chunk.id, "must fail on source drift", fingerprint)).toThrow("KB citation drift");
      expect(getCitations()).toHaveLength(count);
    } finally {
      chunk.text = previousText;
    }
  });

  it("rejects a missing ID even when a fingerprint is supplied", () => {
    expect(() => cite("missing-review-chunk", undefined, "0".repeat(64))).toThrow("Unknown KB chunk id");
  });

  it("preserves legacy citations without claiming a reviewed fingerprint", () => {
    expect(cite("comprehensive-0170", "legacy compatibility").id).toBe("comprehensive-0170");
    expect(getCitations().at(-1)?.fingerprint).toBeUndefined();
  });
});
