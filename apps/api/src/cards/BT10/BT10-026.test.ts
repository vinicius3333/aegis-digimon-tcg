import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-026.js";

describe("BT10-026 DeckerGreymon", () => {
  it("encodes Armor Purge, exact DigiXros materials, and matching On Play/evolution sequences", () => {
    expect(compiled.effects[0]?.keywords).toEqual([expect.objectContaining({ keyword: "Armor Purge" })]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["MetalGreymon"] }, { names: ["Deckerdramon"] }], count: 2 },
    ]);
    for (const effect of compiled.effects.slice(1)) {
      expect(effect.actions).toEqual([
        expect.objectContaining({
          kind: "PlaceUnder",
          from: ["hand", "underTamer"],
          position: "bottom",
          optional: true,
        }),
        expect.objectContaining({
          kind: "Restrict",
          restriction: "attackOrBlock",
          condition: expect.objectContaining({ kind: "selfHasInDigivolutionCards" }),
        }),
      ]);
    }
  });

  it("DigiXroses with MetalGreymon and Deckerdramon for 5 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-024", as: "metalGreymon" },
            { card: "BT10-020", as: "deckerdramon" },
          ],
          hand: [{ card: "BT10-026", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 9;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [s.perm("metalGreymon").topCard.instanceId, s.perm("deckerdramon").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    );

    const source = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("source").instanceId,
    )!;
    expect(s.state.memory).toBe(4);
    expect(source.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT10-024", "BT10-020"]));
  });

  it("places a hand material and chooses one opponent Digimon once for both restrictions", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-026", as: "source" },
            { card: "BT10-020", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "chosen" },
            { card: "BT1-011", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 9;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));
    expect(
      s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("source").instanceId,
      )?.stack.map((card) => card.instanceId),
    ).toContain(s.inst("material").instanceId);
    const restrictionDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: restrictionDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        observe(s.engine).isRestricted(s.perm("chosen"), "attack") &&
        observe(s.engine).isRestricted(s.perm("chosen"), "block"),
    );

    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("other"), "block")).toBe(false);
  });

  it("when digivolving, may take the Blue Flare material from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-021", as: "base" },
            { card: "BT10-088", as: "kiriha", under: ["BT10-020"] },
          ],
          hand: [{ card: "BT10-026", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").stack.some((card) => card.cardId === "BT10-020") &&
        observe(s.engine).isRestricted(s.perm("target"), "attack") &&
        observe(s.engine).isRestricted(s.perm("target"), "block"),
    );

    expect(s.perm("kiriha").stack).toHaveLength(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-020", "BT10-021"]);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });

  it("uses the printed blue level 5 evolution route for 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-024", as: "base" }],
          hand: [{ card: "BT10-026", as: "source" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("source").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("does not take Blue Flare materials from trash or deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-026", as: "source" }],
          trash: [{ card: "BT10-020", as: "trashMaterial" }],
          deck: [{ card: "BT10-020", as: "deckMaterial" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 9;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    );

    const source = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("source").instanceId,
    )!;
    expect(source.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashMaterial").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckMaterial").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
  });

  it("uses Armor Purge to survive deletion and promote its source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-026", as: "source", under: ["BT10-020"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Armor Purge")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId])).toBe(0);

    expect(s.perm("source").topCard.cardId).toBe("BT10-020");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT10-026");
  });
});
