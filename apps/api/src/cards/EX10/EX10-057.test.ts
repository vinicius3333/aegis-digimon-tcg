import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-057.js";
import "../index.js";

const CARD_ID = "EX10-057";

describe("EX10-057 Piedmon", () => {
  it("records the exact catalog and complete executable contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Wizard", "Dark Masters"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find(({ trigger }) => trigger === "Main")).toMatchObject({
      isFromHand: true,
      condition: { kind: "youHaveNone" },
      actions: [
        { kind: "PlayWithoutCost", target: { isSelf: true }, from: ["hand"], payCost: true, reduceCostBy: 5 },
        { kind: "DelayedDeletePlayed" },
      ],
      optional: true,
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "Restrict", on: "digivolveTarget" }],
    });
  });

  it("plays itself from hand for 6 only when every controlled Digimon has Dark Masters in its text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-057", as: "piedmon" }],
          battleArea: ["BT15-027"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const entries = JSON.parse(s.inst("piedmon").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
      instanceId: string;
    }>;
    const entry = entries.find(({ instanceId }) => instanceId === s.inst("piedmon").instanceId);
    expect(entry).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("piedmon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-057"));
    expect(s.state.memory).toBe(-6);
  });

  it("does not expose the hand Main activation while controlling a non-Dark-Masters-text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "piedmon" }],
          battleArea: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const entries = JSON.parse(s.inst("piedmon").activatableEffectsJson || "[]") as Array<{ instanceId: string }>;
    expect(entries.some(({ instanceId }) => instanceId === s.inst("piedmon").instanceId)).toBe(false);
  });

  it("On Play deletes only 1 opposing unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "piedmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "unsuspended" },
            { card: "BT1-010", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const suspendedId = s.perm("suspended").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("piedmon"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([suspendedId]);
  });

  it("places itself face-up at the security bottom on deletion only with no face-up purple security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-057", as: "piedmon" }],
        security: [{ card: "BT1-009", faceUp: false }],
      },
    });
    const instanceId = s.perm("piedmon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("piedmon").permanentId]);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === instanceId));

    const placed = s.state.players[0]!.security.find((card) => card.instanceId === instanceId)!;
    expect(placed.faceUp).toBe(true);
  });

  it("does not return to security when a purple face-up security card already exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-057", as: "piedmon" }],
        security: [{ card: "BT10-071", faceUp: true }],
      },
    });
    const instanceId = s.perm("piedmon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("piedmon").permanentId]);
    await settle();

    expect(s.state.players[0]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("plays a level 5 Dark Masters-text card only when checked from face-up security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-027", as: "playTarget" }],
          security: [{ card: "EX10-057", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-027"));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-027");
  });
});
