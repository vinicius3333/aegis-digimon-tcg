import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-022.js";
import "./index.js";

describe("BT17-022", () => {
  it("carries the printed catalog fields and routes", () => {
    expect(getCardDefinition("BT17-022")).toMatchObject({
      cardId: "BT17-022",
      nameEn: "Lobomon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      types: ["Warrior"],
    });
    const printed = getCardDefinition("BT17-022")!.effectText!;
    expect(printed).toContain("[Digivolve][Koji Minamoto]: Cost 2");
    expect(printed).toContain("[Digivolve][KendoGarurumon]: Cost 1");
    expect(printed).toContain("digivolve this card from your hand onto one of your yellow Tamers");
    expect(printed).toContain("digivolve into [AncientGarurumon] in the hand for a digivolution cost of 3");
    expect(getCardDefinition("BT17-022")!.inheritedEffectText).toBe(
      "[When Attacking] If you have 7 or fewer cards in your hand, ＜Draw 1＞.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the static yellow-Tamer digivolve at level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          asLevel: 3,
          payCost: true,
          target: { count: 1, filter: { kind: ["Tamer"], colors: ["Yellow"] } },
          onto: { filter: { kind: ["Tamer"], colors: ["Yellow"] } },
        },
      ],
    });
  });

  it("compiles the conditional AncientGarurumon slide and its delayed self-delete", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
      condition: { kind: "anyOf" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "DelayedDelete",
      condition: { kind: "ifThisEffectDigivolved" },
    });
  });

  it("compiles the inherited conditional draw while attacking", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    });
  });

  it("exposes the named routes as exact and the generic yellow-Tamer path as derived", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT17-023")).toMatchObject({ cost: 1 });
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT17-083")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT1-087")).toMatchObject({
      cost: 3,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT1-086")).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT10-093")).toBeUndefined();
  });

  it("digivolves from a yellow Tamer as a level 3 base and performs the bonus draw (Q2754, Q2756)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          hand: [{ card: "BT17-022", as: "lobomon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT17-022");

    expect(s.perm("tamer").topCard?.instanceId).toBe(s.inst("lobomon").instanceId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("tamer").instanceId]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("digivolves from Koji Minamoto through the exact [Koji Minamoto] route for 2 (Q2755)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-083", as: "koji" }],
          hand: [{ card: "BT17-022", as: "lobomon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("lobomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-022");

    expect(s.state.memory).toBe(4);
    expect(s.perm("koji").stack.map((card) => card.instanceId)).toEqual([s.inst("koji").instanceId]);
  });

  it("slides into AncientGarurumon from KendoGarurumon in its own stack, then self-deletes end of turn (Q2758, Q2759)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: [
            { card: "BT1-009", as: "b1" },
            { card: "BT1-010", as: "b2" },
            { card: "BT1-011", as: "b3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kendo").permanentId,
        instanceId: s.inst("lobomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kendo").topCard?.cardId === "BT17-028");

    expect(s.perm("kendo").topCard?.cardId).toBe("BT17-028");
    expect(s.perm("kendo").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT17-023", "BT17-022"]));
    expect(s.state.memory).toBe(2);

    const ancientId = s.perm("kendo").topCard!.instanceId;
    await advance(s.engine).runTurn(0);
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028")).toBe(false);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === ancientId)).toBe(true);
  });

  it("slides via the black/purple branch and trashes the whole stack including the Tamer on delete (Q2758)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-087", as: "tamer" },
            { card: "BT10-093", as: "purpleTamer" },
          ],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: [
            { card: "BT1-009", as: "b1" },
            { card: "BT1-010", as: "b2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT17-028");

    expect(s.state.memory).toBe(0);

    const ancientId = s.perm("tamer").topCard!.instanceId;
    await advance(s.engine).runTurn(0);
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028")).toBe(false);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === ancientId)).toBe(true);
  });

  it("does not offer the slide with neither KendoGarurumon in stack nor a black/purple card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT17-022");

    expect(s.perm("tamer").topCard?.cardId).toBe("BT17-022");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ancient").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);

    const lobomonId = s.inst("lobomon").instanceId;
    await advance(s.engine).runTurn(0);
    expect(s.perm("tamer").topCard?.instanceId).toBe(lobomonId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === lobomonId)).toBe(false);
  });

  it("draws 1 as an inherited attacker with 7 or fewer cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "attacker", under: ["BT17-022"] }],
          hand: [{ card: "BT1-009", as: "held" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("held").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw as an inherited attacker with 8 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "attacker", under: ["BT17-022"] }],
          hand: [
            { card: "BT1-009" },
            { card: "BT1-009" },
            { card: "BT1-009" },
            { card: "BT1-009" },
            { card: "BT1-010" },
            { card: "BT1-010" },
            { card: "BT1-010" },
            { card: "BT1-010" },
          ],
          deck: [{ card: "BT1-011", as: "unseen" }],
        },
        1: { security: [{ card: "BT1-012" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended === true);

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("unseen").instanceId]);
  });
});
