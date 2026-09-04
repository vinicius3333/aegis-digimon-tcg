import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX7-074.js";

describe("EX7-074", () => {
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

  it("uses the Option without matching colors when a LIBERATOR Digimon is in the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX7-074", as: "vortex" }],
        battleArea: [{ card: "BT18-060", as: "liberator" }],
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

  it("plays an eligible LIBERATOR from Security and returns itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX7-074", as: "vortex" }],
          hand: ["BT20-085", "BT20-075", "BT1-009"],
          trash: ["EX7-036"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("vortex"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-085")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-074");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-075", "BT1-009"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-036");
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
