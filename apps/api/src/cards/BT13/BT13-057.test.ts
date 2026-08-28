import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-057.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";

describe("BT13-057 Rosemon", () => {
  it("suspends only unsuspended opponent permanents for both clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "Unsuspend",
          cost: expect.objectContaining({
            kind: "suspend",
            target: expect.objectContaining({ filter: expect.objectContaining({ unsuspended: true }) }),
          }),
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          actions: [
            expect.objectContaining({
              kind: "Suspend",
              target: expect.objectContaining({ filter: expect.objectContaining({ unsuspended: true }) }),
            }),
          ],
        }),
      ],
    });
  });

  it("loads the compiled Rosemon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-057", as: "rose" }] } });
    await s.ready();
    expect(s.perm("rose").topCard?.cardId).toBe("BT13-057");
  });

  it("pays the mandatory digivolving cost and unsuspends this Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-057", as: "rose", suspended: true }] },
      1: { battleArea: [{ card: "BT13-047", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("rose"));
    await settle(() => !s.perm("rose").isSuspended && s.perm("opponent").isSuspended);
    expect(s.perm("rose").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("only reacts once to an opponent suspension, not an own suspension", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-057", as: "rose" }, { card: "BT13-047", as: "own" }],
      },
      1: {
        battleArea: [{ card: "BT13-047", as: "firstOpponent" }, { card: "BT13-047", as: "secondOpponent" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("own").permanentId });
    expect(s.perm("firstOpponent").isSuspended).toBe(false);
    expect(s.perm("secondOpponent").isSuspended).toBe(false);

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("firstOpponent").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("secondOpponent").permanentId,
    });
    expect([s.perm("firstOpponent").isSuspended, s.perm("secondOpponent").isSuspended].filter(Boolean)).toHaveLength(1);
  });
});
