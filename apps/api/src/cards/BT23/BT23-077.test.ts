import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-077.js";

describe("BT23-077 Sistermon Ciel", () => {
  it("anchors the watcher to this card rather than any suspended permanent", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher.sourceFilter).toEqual({ isSelfRef: true });
    expect(watcher.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
  });
});
