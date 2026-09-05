import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-030.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-030", () => {
  it("creates a Familiar token at the start of the main phase and on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "PlayToken",
      tokens: ["Familiar"],
      count: 1,
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayToken",
      tokens: ["Familiar"],
    });
  });
  it("attacks at end of turn by Overclock cost and reduces an opposing Digimon by 6000 DP when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      withoutSuspending: true,
      cost: { kind: "deleteOwn" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
    });
  });
  it("plays a Familiar token at the start of the main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-030", as: "cendrillmon" }] } },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("cendrillmon"));
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId.includes("Familiar")),
    ).toHaveLength(1);
  });

  it("plays a Familiar token when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-030", as: "cendrillmon" }] } },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("cendrillmon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("Familiar")),
    );
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId.includes("Familiar")),
    ).toHaveLength(1);
  });

  it("reduces one opposing Digimon by 6000 when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-030", as: "source" }] },
        1: { battleArea: [{ card: "EX7-011", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("executes the errata-mandated Overclock attack by deleting a Token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-030", as: "cendrillmon", dp: 6000 },
            { card: "TOKEN-Familiar-Token", as: "familiar", dp: 1000 },
          ],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("cendrillmon").permanentId;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("cendrillmon"));
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "TOKEN-Familiar-Token"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "TOKEN-Familiar-Token")).toBe(false);
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          (event as { attackerPermanentId?: string }).attackerPermanentId === sourceId,
      ),
    ).toBe(true);
    expect(s.perm("cendrillmon").isSuspended).toBe(false);
  });
});
