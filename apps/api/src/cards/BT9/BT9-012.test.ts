import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-012.js";

describe("BT9-012 Greymon (X Antibody)", () => {
  it("may trash 2 same-level sources to prevent an effect from deleting its Greymon host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-015", as: "host", under: ["BT9-012", "BT1-016"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not prevent rule deletion even when the same-level cost is available", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-015", as: "host", under: ["BT9-012", "BT1-016"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byRule");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });

  it("may decline prevention and leave its digivolution cards unpaid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-015", as: "host", under: ["BT9-012", "BT1-016"] }] },
    });
    const deleting = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const decision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await deleting;
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
