import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

const GRANTED_CLAUSE = "[End of Attack] Delete this Digimon.";

describe("granted end-of-attack deletion shows on its recipient", () => {
  it("publishes the clause LadyDevimon (X Antibody) grants when digivolving until the recipient's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-053", as: "base" }],
          hand: [{ card: "EX7-058", as: "ladyX" }],
          deck: Array(6).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "recipient" }], deck: Array(6).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    expect([...s.perm("recipient").grantedEffectTexts]).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ladyX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Volée-&-Zerdrücken"),
    );
    expect([...s.perm("recipient").grantedEffectTexts]).toEqual([GRANTED_CLAUSE]);
    expect([...s.state.players[0]!.battleArea].flatMap((permanent) => [...permanent.grantedEffectTexts])).toEqual([]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect([...s.perm("recipient").grantedEffectTexts]).toEqual([GRANTED_CLAUSE]);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect([...s.perm("recipient").grantedEffectTexts]).toEqual([]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publishes the clause Witchmon grants on play only on the chosen recipient", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-048", as: "witchmon" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: Array(6).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "recipient" },
            { card: "BT1-010", as: "bystander" },
          ],
          deck: Array(6).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    const grantedTexts = [s.perm("recipient"), s.perm("bystander")].map((permanent) => [
      ...permanent.grantedEffectTexts,
    ]);
    expect(grantedTexts.toSorted((first, second) => second.length - first.length)).toEqual([[GRANTED_CLAUSE], []]);
  });
});
