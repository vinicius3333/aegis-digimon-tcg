import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT14/BT14-043.js";
import { compiled } from "./BT17-089.js";
import "./index.js";

describe("BT17-089 Rhythm", () => {
  it("matches the immutable catalog identity and preserves full IR coverage", () => {
    expect(getCardDefinition("BT17-089")).toMatchObject({
      nameEn: "Rhythm",
      colors: ["Green", "Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      effectText: expect.stringContaining("When an effect suspends"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("provides both suspension-triggered Your Turn effects", () => {
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      actions: [
        { kind: "GainMemory", amount: 1 },
        {
          kind: "Draw",
          condition: {
            kind: "youHave",
            filter: {
              nameOrTrait: [{ tokens: ["Argomon"], match: "name" }],
              orFilters: [
                {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Yellow"],
                  nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }],
                },
              ],
            },
          },
        },
      ],
    });
  });

  it("provides the Security play effect", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }],
    });
  });

  it("suspends after an effect suspends a Digimon, then gains memory and draws", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "suspendedByCost" },
            { card: "BT17-089", as: "rhythm" },
            { card: "BT17-045", as: "argomon" },
          ],
          hand: [{ card: "BT14-043", as: "suspender" }],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT17-044", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("suspendedByCost").permanentId);
    s.state.memory = 10;
    const drawnId = s.inst("drawn").instanceId;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.perm("suspendedByCost").isSuspended).toBe(true);
    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
  });

  it("gains memory but does not draw when neither Argomon nor a yellow Agumon/Greymon is present", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "suspendedByCost" },
            { card: "BT17-089", as: "rhythm" },
          ],
          hand: [{ card: "BT14-043", as: "suspender" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }],
        },
        1: { battleArea: [{ card: "BT17-044", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("suspendedByCost").permanentId);
    s.state.memory = 10;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rhythm").isSuspended);

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
        1: { security: [{ card: "BT17-089", as: "securityRhythm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityRhythm").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
  });
});
