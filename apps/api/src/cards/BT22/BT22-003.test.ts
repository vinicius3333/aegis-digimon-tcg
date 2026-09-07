import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT22-003.js";

describe("BT22-003 Tapmon", () => {
  it("hatches publicly into Tapmon's legal Appmon evolution stack and rejects Agumon", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT22-003", as: "egg" }],
        hand: [
          { card: "BT21-009", as: "gatchmon" },
          { card: "BT22-008", as: "invalidAgumon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-003");
    s.state.phase = Phase.Main;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("gatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT21-009");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-003"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("invalidAgumon").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("reduces one opposing Digimon by 2000 when its inherited host gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", under: ["BT22-003"], as: "host" }],
          hand: [{ card: "BT21-009", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT1-010", as: "untargetedOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const originalDp = s.perm("opponent").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);

    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);
    expect(s.perm("untargetedOpponent").currentDP).toBe(s.perm("untargetedOpponent").baseDP);
  });

  it("does not trigger for another stack, on the opponent's turn, or twice in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", under: ["BT22-003"], as: "host" },
            { card: "BT21-009", as: "otherHost" },
          ],
          hand: [
            { card: "BT21-009", as: "otherLink" },
            { card: "BT21-009", as: "firstLink" },
            { card: "BT21-009", as: "secondLink" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT21-009", as: "opponentHost" },
          ],
          hand: [{ card: "BT21-009", as: "opponentLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const originalDp = s.perm("opponent").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("otherLink").instanceId,
        targetPermanentId: s.perm("otherHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherHost").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "linkCard",
        instanceId: s.inst("opponentLink").instanceId,
        targetPermanentId: s.perm("opponentHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentHost").linked.length === 1);
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);
  });

  it("expires the -2000 DP grant after the complete opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", under: ["BT22-003"], as: "host" }],
          hand: [{ card: "BT21-009", as: "link" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 2;
    const baseDp = s.perm("opponent").baseDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === baseDp - 2000);
    expect(s.perm("opponent").currentDP).toBe(baseDp - 2000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("opponent").currentDP).toBe(baseDp);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("opponent").currentDP).toBe(baseDp);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
