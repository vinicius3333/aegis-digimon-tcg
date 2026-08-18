import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-024.js";

describe("BT9-024 Garurumon (X Antibody)", () => {
  it("may trash 2 same-level sources to prevent battle deletion of its Garurumon host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-031", as: "host", under: ["BT9-024", "BT9-025"] }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not prevent deletion by an effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-031", as: "host", under: ["BT9-024", "BT9-025"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.decisions).toHaveLength(0);
  });
});
