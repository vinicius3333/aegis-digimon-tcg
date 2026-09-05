import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-036.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-036", () => {
  it("has Security Attack +1 and Vortex", () => {
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
      ]),
    );
  });
  it("bottom-decks one suspended opposing Digimon after suspending a Digimon on digivolving and attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Suspend" },
      { kind: "Return", to: "deckBottom", condition: { kind: "lastSuspendedIsMine" } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([
      { kind: "Suspend" },
      { kind: "Return", to: "deckBottom", condition: { kind: "lastSuspendedIsMine" } },
    ]);
  });
  it("has Bird Dragon as a rule trait", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Bird Dragon"],
    }));

  it("bottom-decks a suspended opposing Digimon when the effect suspends an ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-036", as: "source" },
            { card: "EX7-031", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "EX7-011", as: "target", suspended: true }] },
      },
      { autoSelectCards: false },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ally").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(
      () => s.perm("ally").isSuspended && !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId),
    );
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("does not bottom-deck an opponent when it suspends an opponent instead", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-036", as: "source" }] },
        1: { battleArea: [{ card: "EX7-011", as: "target", suspended: true }] },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(() => s.perm("target").isSuspended);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
  });
});
