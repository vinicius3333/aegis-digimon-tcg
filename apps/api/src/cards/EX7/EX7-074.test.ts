import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX7-074.js";

describe("EX7-074 Vortex Resonance", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-074")).toMatchObject({
      cardId: "EX7-074",
      nameEn: "Vortex Resonance",
      colors: ["Green", "Yellow", "Purple"],
      kinds: ["Option"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText:
        "[Security] You may play 1 card with the [LIBERATOR] trait with a play cost of 4 or less from your hand or trash without paying the cost. Then, add this card to the hand.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-074")).toBe(true);
  });
  it("waives its color requirement if you have a LIBERATOR Digimon or Tamer", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      optional: true,
      condition: { kind: "youHave" },
    }));
  it("reveals 3 for a LIBERATOR card and may digivolve from hand with cost reduced by 4", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "RevealAdd", revealCount: 3 },
      { kind: "Digivolve", from: ["hand"], reduceCost: 4, payCost: true, optional: true },
    ]));
  it("plays a low-cost LIBERATOR card from security and adds itself to hand", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
      { kind: "AddToHandSelf" },
    ]));

  it.each([
    ["BT18-060", "Digimon"],
    ["BT18-087", "Tamer"],
  ])("uses the Option without matching colors when a LIBERATOR %s is in the battle area", async (liberator) => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX7-074", as: "vortex" }],
        battleArea: [{ card: liberator, as: "liberator" }],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toEqual({
      ok: true,
    });
  });

  it("does not waive colors for a LIBERATOR Digimon in the breeding area (Q3873)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX7-074", as: "vortex" }],
        breeding: { card: "BT18-060", as: "liberator" },
      },
    });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("reveals exactly three, adds one LIBERATOR, bottoms the rest, and digivolves for zero", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-074", as: "vortex" }],
          battleArea: [{ card: "EX7-031", as: "host" }],
          deck: ["EX7-032", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.cardId === "EX7-032");
    expect(s.perm("host").topCard?.cardId).toBe("EX7-032");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-074");
  });

  it("can decline the optional digivolution after resolving the reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-074", as: "vortex" }],
          battleArea: [{ card: "EX7-031", as: "host" }],
          deck: ["EX7-032", "BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX7-032"));
    expect(s.perm("host").topCard?.cardId).toBe("EX7-031");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-032");
  });

  it("pays the remaining two memory for a cost-six evolution after the four-memory reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-074", as: "vortex" }, "BT1-084"],
          battleArea: [{ card: "BT8-017", as: "host" }, "EX7-064"],
          deck: ["BT1-028", "BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-084");
    expect(s.perm("host").topCard?.cardId).toBe("BT1-084");
    // Option 3 + (printed evolution 6 - reduction 4) = 5 memory paid.
    expect(s.state.memory).toBe(5);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT8-017"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-074");
  });

  it.each([
    ["hand", "BT20-085"],
    ["trash", "EX7-031"],
  ] as const)(
    "plays an eligible LIBERATOR from %s during a real Security check and returns itself to hand",
    async (zone, candidate) => {
      const s = setupEngine(
        {
          0: {
            security: [{ card: "EX7-074", as: "vortex" }, "BT1-009"],
            hand:
              zone === "hand" ? [{ card: candidate, as: "candidate" }, "BT20-075", "BT1-009"] : ["BT20-075", "BT1-009"],
            trash: zone === "trash" ? [{ card: candidate, as: "candidate" }, "EX7-036"] : ["EX7-036"],
          },
          1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());

      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("candidate").instanceId,
        ),
      ).toBe(true);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-074");
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT20-075", "BT1-009"]),
      );
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-036");
    },
  );

  it("can refuse the Security play and still adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX7-074", as: "vortex" }, "BT1-009"],
          hand: [{ card: "BT20-085", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("candidate").instanceId, s.inst("vortex").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("rejects use without a matching color or LIBERATOR trait", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX7-074", as: "vortex" }], battleArea: ["BT1-009"] } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vortex").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});
