import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-055.js";

describe("BT15-055", () => {
  it("reveals three to add a Machine/Cyborg and a black Tamer", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1 }, { count: 1 }] }],
    }));
  it("unsuspends itself as an inherited effect", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    }));
});
