import { EffectTiming, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-090.js";

describe("BT5-090 Arata Sanada", () => {
  it("gains 1 memory at turn start with an Unidentified Digimon in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-090", as: "arata" }],
        trash: ["BT5-059"],
        deck: ["BT1-009", "BT1-010"],
        hand: ["BT5-071"],
      },
      1: { deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;
    const before = s.state.memory;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as any).mainPhase as { isOpen: boolean };
    await settle(() => s.state.memory === before + 1 && mainPhase.isOpen);
    expect(s.state.memory).toBe(before + 1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });

  it("suspends when a Diaboromon digivolves to play a Diaboromon token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-090", as: "arata" },
            { card: "BT5-066", as: "base" },
          ],
          hand: [{ card: "BT5-084", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("arata").isSuspended &&
        s.state.players[0]?.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon") === true,
    );

    const token = s.state.players[0]?.battleArea.find((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon");
    expect(token).toBeDefined();
    expect(requireCardDefinition(token!.topCard.cardId)).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      playCost: 14,
      dp: 3000,
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
      isToken: true,
    });
  });

  it("does not trigger when a different Digimon digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-090", as: "arata" },
            { card: "BT5-063", as: "base" },
          ],
          hand: [{ card: "BT5-067", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT5-067");
    expect(s.perm("arata").isSuspended).toBe(false);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon"),
    ).toHaveLength(0);
  });

  it("does not treat Diaboromon (X Antibody) as an exact Diaboromon name match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-090", as: "arata" },
            { card: "BT5-066", as: "base" },
          ],
          hand: [{ card: "BT24-065", as: "xAntibody" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-065");

    expect(s.perm("arata").isSuspended).toBe(false);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon"),
    ).toHaveLength(0);
  });

  it("may decline playing the Diaboromon Token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-090", as: "arata" },
            { card: "BT5-066", as: "base" },
          ],
          hand: [{ card: "BT5-084", as: "evolving" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-084");

    expect(s.perm("arata").isSuspended).toBe(false);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon"),
    ).toHaveLength(0);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-090", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
  });
});
