import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-005.js";

describe("BT17-005", () => {
  it("gains 1 memory on deletion as inherited when it had Unidentified", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "selfHasTrait" } }],
    });
  });

  it("gains memory when its Unidentified host is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-059", as: "host", under: ["BT17-005"] }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when its host lacks the Unidentified trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-030", as: "host", under: ["BT17-005"] }] } });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.memory).toBe(0);
  });
});
