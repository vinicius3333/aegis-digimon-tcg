import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-018.js";

describe("EX6-018 Lucemon", () => {
  it("reduces play cost by 5 when you have no level 5 or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 5, condition: { kind: "youHaveNone" } }],
    });
  });
  it("reveals three for Angel-family or Seven Great Demon Lords cards and can evolve into Chaos Mode from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "trash",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "place", destination: "security", position: "top", targetIsPermanent: true },
      actions: [{ kind: "Digivolve", from: ["trash"], payCost: false, optional: true }],
    });
  });
  it("pays the level-6 security cost before independently offering the optional trash evolution", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0];
    expect(action).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "place", destination: "security", targetIsPermanent: true },
      actions: [{ kind: "Digivolve", optional: true, from: ["trash"] }],
    });
    expect(action).not.toHaveProperty("into");
  });

  it("places a level-6 Digimon into security and evolves into exact Chaos Mode from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-018", as: "lucemon" },
            { card: "EX6-029", as: "levelSix" },
          ],
          trash: [{ card: "EX6-054", as: "chaosMode" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const levelSixId = s.inst("levelSix").instanceId;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("lucemon"));
    await settle(() => s.perm("lucemon").topCard.cardId === "EX6-054");
    expect(s.state.players[0]!.security.some((card) => card.instanceId === levelSixId)).toBe(true);
    expect(s.perm("lucemon").topCard.cardId).toBe("EX6-054");
  });

  it("publicly reveals three cards and adds Angel and Seven Great Demon Lords matches", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-018", as: "lucemon" }], deck: ["EX6-019", "EX6-054", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX6-019"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX6-019");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX6-054", "BT1-001"]),
    );
  });

  it("publicly reduces its play cost to zero when no level 5 or lower Digimon is present", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-018", as: "lucemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    ).toBe(true);
  });

  it("publicly resolves the main-phase reveal independently of On Play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-018", as: "lucemon" }], deck: ["EX6-019", "EX6-054", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("lucemon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX6-019"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX6-019");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX6-054");
  });

  it("still pays the level-6 security cost when no Chaos Mode is available in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-018", as: "lucemon" },
            { card: "EX6-029", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const levelSixId = s.inst("levelSix").instanceId;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("lucemon"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === levelSixId)).toBe(true);
    expect(s.perm("lucemon").topCard.cardId).toBe("EX6-018");
  });

  it("keeps the paid security cost when the optional Chaos Mode evolution is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-018", as: "lucemon" },
          { card: "EX6-029", as: "levelSix" },
        ],
        trash: [{ card: "EX6-054", as: "chaosMode" }],
      },
    });
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("lucemon"));
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 1);
    const activation = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const evolution = s.decisions.filter(({ req }) => req.kind === "optional").at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolution.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("levelSix").instanceId)).toBe(true);
    expect(s.perm("lucemon").topCard.cardId).toBe("EX6-018");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chaosMode").instanceId)).toBe(true);
  });
});
