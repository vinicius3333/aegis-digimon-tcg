import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-023.js";
import "./index.js";

describe("BT20-023 Coredramon", () => {
  it("reacts only to green Digimon with Dracomon or Examon in their text", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Jamming", raw: "＜Jamming＞" },
    ]);
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Green"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Wingdramon"], match: "nameExact" }] },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("matches the printed Wingdramon destination exactly while Dracomon in-name evolution remains containing", () => {
    expect(matchNameOrTrait({ nameEn: "Wingdramon" }, { tokens: ["Wingdramon"], match: "nameExact" })).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Wingdramon X" }, { tokens: ["Wingdramon"], match: "nameExact" })).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Dracomon (X Antibody)" }, { tokens: ["Dracomon"], match: "name" })).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Dramon" }, { tokens: ["Dracomon"], match: "name" })).toBe(false);
  });

  it("pays Wingdramon's cost reduced by 2 only after a qualifying green text match is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [
            { card: "BT20-040", as: "greenTextMatch" },
            { card: "BT20-025", as: "wingdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    await s.ready();
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenTextMatch").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("coredramon").topCard.cardId === "BT20-025");
    expect(s.state.memory).toBe(0);
    expect(s.perm("coredramon").stack.map((card) => card.cardId)).toContain("BT20-023");

    const negative = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [
            { card: "BT20-023", as: "nonGreenTextMatch" },
            { card: "BT20-025", as: "wingdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    negative.state.memory = 9;
    expect(
      negative.engine.applyIntent(0, { type: "playCard", instanceId: negative.inst("nonGreenTextMatch").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => false, 50);
    expect(negative.perm("coredramon").topCard.cardId).toBe("BT20-023");
  });

  it("also reacts to a green Digimon whose name supplies the Examon text match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [
            { card: "BT20-045", as: "examonMatch" },
            { card: "BT20-025", as: "wingdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("examonMatch").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("coredramon").topCard.cardId === "BT20-025");
    expect(s.perm("coredramon").topCard.cardId).toBe("BT20-025");
  });

  it("does not react to a qualifying green Digimon played during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [{ card: "BT20-025", as: "wingdramon" }],
          deck: ["BT1-009"],
        },
        1: {
          hand: [{ card: "BT20-040", as: "opponentGreen" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentGreen").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 50);
    expect(s.perm("coredramon").topCard.cardId).toBe("BT20-023");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wingdramon").instanceId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("can decline the optional reduced Wingdramon evolution without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [
            { card: "BT20-040", as: "greenTextMatch" },
            { card: "BT20-025", as: "wingdramon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenTextMatch").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("coredramon").topCard.cardId === "BT20-023" && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wingdramon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("has Jamming and grants inherited +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-025", dp: 7000, as: "host", under: ["BT20-023"] }],
        deck: ["BT1-009"],
      },
      1: { deck: ["BT1-009"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    expect(s.perm("host").currentDP).toBe(9000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    const direct = setupEngine({ 0: { battleArea: [{ card: "BT20-023", as: "coredramon" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("coredramon"), "Jamming")).toBe(true);
  });

  it("survives a public security battle through Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-023", as: "coredramon" }] },
      1: { security: [{ card: "BT1-027", as: "strongSecurity" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("coredramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("coredramon").topCard.cardId).toBe("BT20-023");
  });

  it("reaches Coredramon from a legal Dracomon stack through public evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-007", as: "dracomon" }], hand: [{ card: "BT20-023", as: "coredramon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dracomon").permanentId,
        instanceId: s.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dracomon").topCard.cardId === "BT20-023");
    expect(s.perm("dracomon").topCard.cardId).toBe("BT20-023");
    expect(s.perm("dracomon").stack.map((card) => card.cardId)).toEqual(["BT20-007"]);
  });
});
