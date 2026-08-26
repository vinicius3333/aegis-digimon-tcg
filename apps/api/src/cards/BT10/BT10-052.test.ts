import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-003.js";
import { compiled } from "./BT10-052.js";

describe("BT10-052 Cherrymon", () => {
  it("matches its catalog and exact Digisorption plus redirect IR", () => {
    const d = getCardDefinition("BT10-052")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 5, 7, 7000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 4, memoryCost: 3 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Ultimate"], ["Virus"], ["Vegetation"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Digisorption" })] }),
      expect.objectContaining({ trigger: "OpponentsTurn", frequency: "OncePerTurn" }),
    ]);
  });

  it("uses Digisorption to suspend a Digimon and reduce its digivolution cost by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-048", as: "base" },
            { card: "BT10-046", as: "cost" },
          ],
          hand: [{ card: "BT10-052", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.perm("base").topCard.cardId).toBe("BT10-052");
    expect([s.perm("base"), s.perm("cost")].some((permanent) => permanent.isSuspended)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("pays the full digivolution cost when Digisorption is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-048", as: "base" },
            { card: "BT10-046", as: "cost" },
          ],
          hand: [{ card: "BT10-052", as: "evolving" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("cost").isSuspended).toBe(false);
  });

  it("cannot receive the Digisorption reduction when no Digimon can be suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-048", as: "base", suspended: true }],
          hand: [{ card: "BT10-052", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);

    expect(s.state.memory).toBe(0);
  });

  it("may redirect an opponent's player attack to itself while suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-052", as: "cherrymon", suspended: true }],
          security: ["BT1-001"],
        },
        // Keep the attacker neutral: this case isolates Cherrymon's redirect window
        // from unrelated [When Attacking] effects registered by the full-set gate.
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 13000 }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("cherrymon").permanentId);
    s.state.turnSeat = 1;
    const cherrymonId = s.perm("cherrymon").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === cherrymonId));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-052")).toBe(true);
  });

  it("resolves the turn player's When Attacking effect alongside its redirect window (Q1976)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-052", as: "cherrymon", suspended: true }], security: ["BT1-001"] },
        1: {
          battleArea: [{ card: "BT10-009", as: "attacker", under: ["BT10-003"], dp: 13000 }],
          deck: [{ card: "BT1-002", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cherrymon").permanentId);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
