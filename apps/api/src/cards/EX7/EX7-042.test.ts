import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-042.js";

describe("EX7-042", () => {
  it("draws 2 by optionally trashing a Rock Dragon or Earth Dragon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      cost: { kind: "trash", target: { filter: { zone: "hand" } } },
    }));
  it("plays Hina Kurihara when digivolving with one or fewer Tamers and inherits +2000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      condition: {
        kind: "zoneCount",
        filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"] },
        op: "lte",
        value: 1,
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      target: { filter: { nameOrTrait: [{ tokens: ["Hina Kurihara"], match: "nameExact" }] } },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("trashes a Rock Dragon and draws two on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-042", as: "jazard" }], hand: ["BT2-011"], deck: ["BT1-001", "BT1-002"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("jazard"));
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-011")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("plays exact Hina Kurihara on a legal digivolution with one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "EX7-042", as: "jazard" },
            { card: "EX3-065", as: "hina" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jazard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX3-065"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX3-065")).toBe(true);
  });
});
