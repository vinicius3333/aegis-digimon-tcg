import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-074 peer All Turns once-per-turn optional triggers", () => {
  it("lets the normal and inherited EX13-044 battle watchers be declined and used on a later suspension", async () => {
    const declinedPrompts = ["Battle"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-044", as: "normal" },
            { card: "EX13-045", as: "inherited", under: ["EX13-044"] },
            { card: "BT20-023", as: "battler" },
            { card: "BT1-014", as: "firstTrigger" },
            { card: "BT1-014", as: "secondTrigger" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstVictim", dp: 1000 },
            { card: "BT1-013", as: "secondVictim", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: declinedPrompts },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstTrigger").permanentId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    declinedPrompts.length = 0;
    await advance(s.engine).verb.suspend([s.perm("secondTrigger").permanentId]);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT1-013")).toHaveLength(2);
  });

  it("reaches EX13-044's optional watcher from a public attack intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-044", as: "breakdramon" },
            { card: "BT20-023", as: "battler" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim", dp: 20000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Battle"] },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(
      s.decisions.some(
        ({ req }) => req.kind === "optional" && req.promptText === "Battle" && req.sourceCardId === "EX13-044",
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("keeps EX13-051's inherited optional-only unsuspend available after declining a Digimon suspension", async () => {
    const declinedPrompts = ["Unsuspend"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "guardromon", suspended: true, under: [{ card: "EX13-051", as: "guardromonCard" }] },
            { card: "BT1-014", as: "secondBlocker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstAttacker", dp: 1000 },
            { card: "BT1-013", as: "secondAttacker", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: declinedPrompts },
    );
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("secondBlocker").permanentId]);
    expect(s.perm("guardromon").isSuspended).toBe(true);

    declinedPrompts.length = 0;
    await advance(s.engine).verb.unsuspend([s.perm("secondBlocker").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("secondBlocker").permanentId]);
    expect(s.perm("guardromon").isSuspended).toBe(false);
  });

  it("keeps EX13-051's inherited watcher available when its host cannot unsuspend yet", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: "EX13-051", as: "guardromonCard" }] },
            { card: "BT1-014", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    expect(
      s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText?.includes("Unsuspend")),
    ).toHaveLength(0);

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText?.includes("Unsuspend")),
    ).toHaveLength(1);
  });
});
