import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("bounded trigger ordering and pending source departure", () => {
  it("offers two real trash triggers together, then drops only the source that departed", async () => {
    cite(
      "comprehensive-0164",
      "simultaneous triggers are pending together and the player chooses their activation order",
    );
    cite(
      "comprehensive-0165",
      "a pending effect whose source no longer meets its trigger conditions cannot activate",
    );

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-083", as: "base" }],
          hand: [{ card: "EX7-061", as: "lilithmonX" }],
          trash: [
            { card: "EX7-072", as: "first" },
            { card: "EX7-072", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilithmonX").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${s.inst("first").instanceId}::`),
        expect.stringContaining(`${s.inst("second").instanceId}::`),
      ]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[0]!] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.players[0]!.deck.some(({ instanceId }) => instanceId === s.inst("first").instanceId));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("first").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });
});
