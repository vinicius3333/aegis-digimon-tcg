import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-027.js";

describe("BT11-027 Veedramon", () => {
  it("matches the catalog and carries both complete play watchers", () => {
    expect(getCardDefinition("BT11-027")).toMatchObject({
      cardId: "BT11-027",
      nameEn: "Veedramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Mythical Dragon"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }] },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenPlayed" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from blue level 3 for 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-023", as: "base" }], hand: [{ card: "BT11-027", as: "veedramon" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-027");
    expect(s.state.memory).toBe(2);
  });
  it("draws when its controller plays a blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", as: "veedramon" }],
        hand: [{ card: "BT11-090", as: "blueTamer" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when a non-blue Tamer is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", as: "veedramon" }],
        hand: [{ card: "BT1-085", as: "redTamer" }],
        deck: [{ card: "BT1-001", as: "notDrawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("redTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("redTamer").instanceId),
    );
    await Promise.resolve();

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("notDrawn").instanceId);
  });

  it("inherited effect gains 1 memory for the same blue Tamer play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-029", under: ["BT11-027"] }],
        hand: [{ card: "BT11-090", as: "blueTamer" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8);

    expect(s.state.memory).toBe(8);
  });

  it("draws only once across two qualifying blue Tamer plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", as: "veedramon" }],
        hand: [
          { card: "BT11-090", as: "first" },
          { card: "BT11-090", as: "second" },
        ],
        deck: [
          { card: "BT1-001", as: "drawn" },
          { card: "BT1-002", as: "notDrawn" },
        ],
      },
    });
    s.state.memory = 10;
    for (const alias of ["first", "second"] as const) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst(alias).instanceId),
      );
    }
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toContain(s.inst("notDrawn").instanceId);
  });
});
