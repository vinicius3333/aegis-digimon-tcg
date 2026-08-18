import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-081.js";
import "./BT10-082.js";

describe("BT10-081 Baalmon", () => {
  it("may trash up to 3 cards from the top of the deck when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-081", as: "baalmon" }], deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("baalmon"));
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("counts its deleted stack for the 10-card gate and can play Beelzemon from that stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-081",
              as: "baalmon",
              under: [{ card: "BT10-082", as: "stackBeelzemon" }],
            },
          ],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: false },
    );
    const beelzemonId = s.inst("stackBeelzemon").instanceId;
    const baalmonId = s.perm("baalmon").topCard.instanceId;

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("baalmon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const baalmonChoice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "BT10-081" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: baalmonChoice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "BT10-082",
    );
    const beelzemonChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: beelzemonChoice.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });

    expect(await deletion).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === beelzemonId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === baalmonId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === beelzemonId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not offer Beelzemon when deleting the whole stack leaves only 9 cards in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-081",
              as: "baalmon",
              under: [{ card: "BT10-082", as: "stackBeelzemon" }],
            },
          ],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: false },
    );
    const beelzemonId = s.inst("stackBeelzemon").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("baalmon").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(9);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === beelzemonId)).toBe(true);
    assertNoLoudGap(s);
  });
});
