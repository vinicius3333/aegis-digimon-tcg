import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-035.js";
import "../BT1/BT1-055.js";

describe("EX6-035 Cherubimon", () => {
  it("has Blast Digivolve and Alliance and plays a level 4 or lower yellow/green Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Alliance");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Yellow", "Green"], levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("reduces an opposing Digimon by 4000 per other allied Digimon on play and digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      scaling: { per: 1, unit: "cards", filter: { excludeSelf: true } },
    }));
  it("publicly plays a level-3 yellow Digimon from hand on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-035", as: "cherub" }], hand: [{ card: "EX6-016", as: "rookie" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherub"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(true);
  });

  it("publicly reduces an opposing Digimon by 4000 for one other allied Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-035", as: "cherub" },
          { card: "BT1-009", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherub"));
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });

  it("still resolves the Then reduction when the optional hand play is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-035", as: "cherub" },
          { card: "BT1-009", as: "ally" },
        ],
        hand: [{ card: "EX6-016", as: "rookie" }],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherub"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const decision = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rookie").instanceId)).toBe(true);
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });

  it("scales the reduction to zero or two other allied Digimon", async () => {
    const none = setupEngine({
      0: { battleArea: [{ card: "EX6-035", as: "cherub" }] },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await none.ready();
    const unchanged = none.perm("opponent").currentDP;
    await advance(none.engine).fire(EffectTiming.OnPlay, none.perm("cherub"));
    expect(none.perm("opponent").currentDP).toBe(unchanged);

    const two = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-035", as: "cherub" },
          { card: "BT1-009", as: "allyA" },
          { card: "BT1-009", as: "allyB" },
        ],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await two.ready();
    const before = two.perm("opponent").currentDP;
    await advance(two.engine).fire(EffectTiming.OnPlay, two.perm("cherub"));
    expect(two.perm("opponent").currentDP).toBe(before - 8000);
  });

  it("finishes Then before the played Digimon On Play and defers zero-DP deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-035", as: "cherub" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT1-055", as: "child" }],
        },
        1: { battleArea: [{ card: "EX6-031", as: "target", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetTopId = s.perm("target").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherub"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("child").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("child").instanceId)).toBe(
      true,
    );
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(false);

    const parentResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "EX6-035" && event.timing === "OnPlay",
    );
    const targetDeleted = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(targetTopId),
    );
    const childOnPlayResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-055" && event.timing === "OnPlay",
    );
    expect(parentResolved).toBeGreaterThanOrEqual(0);
    // Q5726/Q5727: the parent's Then and zero-DP sweep complete before the played card's On Play.
    expect(targetDeleted).toBeGreaterThan(parentResolved);
    expect(childOnPlayResolved).toBeGreaterThan(targetDeleted);
  });

  it("publicly applies the same scaled reduction when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-035", as: "cherub" },
          { card: "BT1-009", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("cherub"));
    expect(s.perm("opponent").currentDP).toBe(before - 4000);
  });
});
