import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-036.js";

describe("EX6-036 Keramon", () => {
  it("reveals three for Diaboromon text and Unidentified cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "trash",
    }));
  it("inherits optional Diaboromon token play on deletion when it had Unidentified", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "PlayToken", tokens: ["Diaboromon"], count: 1, optional: true, condition: { kind: "selfHasTrait" } },
      ],
    }));
  it("publicly adds the matching Tamer and Option from its reveal", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-036", as: "keramon" }], deck: ["BT5-090", "EX6-043", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("keramon"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT5-090", "EX6-043"]));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("publicly plays a Diaboromon token when an Unidentified Keramon is deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT17-053", as: "host", under: ["EX6-036"] }] } },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Diaboromon"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Diaboromon")).toBe(true);
  });
});
