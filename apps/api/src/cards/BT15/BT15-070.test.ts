import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-070.js";

describe("BT15-070", () => {
  it("reveals four to add a Myotismon-text card and trashes one card if cards were added", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      rest: "deckBottom",
      add: [{ count: 1 }],
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Trash",
      target: { count: 1, filter: { zone: "hand" } },
      condition: { kind: "ifThisEffectActed" },
    });
  });
  it("deletes the opposing battle partner when deleted after losing a battle", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { filter: { sourceRef: "battleOpponent" } } }],
    }));
});
