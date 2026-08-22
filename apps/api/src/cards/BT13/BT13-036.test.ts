import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-036.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-036 Liollmon", () => {
  it("gains memory on security removal and preserves the inherited security-count debuff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSecurityRemoved" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "ModifyDP", amount: -2000, condition: expect.objectContaining({ kind: "totalSecurityCount", value: 6 }) })] });
  });

  it("gains one memory when a security card is removed during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-036", as: "lioll" }], security: ["BT1-001"] } }, { autoAcceptOptional: true });
    await s.ready();
    const before = s.state.memory;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.state.memory === before + 1, 3000);
    expect(s.state.memory).toBe(before + 1);
  });
});
