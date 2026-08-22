import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX4-033.js";

describe("EX4-033 Terriermon Assistant", () => {
  it("is also treated as Terriermon and gains 4000 DP when an effect suspends it", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: "name", tokens: ["Terriermon"] });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenEffectSuspends", sourceFilter: { isSelfRef: true }, actions: [{ kind: "ModifyDP", amount: 4000 }] });
  });
  it("inherited Alliance suspension can digivolve this card into a green multicolor Digimon", () => {
    const inherited = compiled.effects?.filter((entry) => entry.trigger === "YourTurn")[1]?.actions?.[0];
    expect(inherited).toMatchObject({ bySourceKeyword: "Alliance" });
    expect((inherited as { actions?: unknown[] } | undefined)?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], optional: true });
  });

  it("grants 4000 DP when an effect suspends this Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-033", as: "source" }] } });
    const before = s.perm("source").currentDP;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenEffectSuspends", {
      subjectPermanentId: s.perm("source").permanentId,
      suspendedPermanentId: s.perm("source").permanentId,
      effectSuspendSeat: 0,
    });
    await settle(() => s.perm("source").currentDP === before + 4000);

    expect(s.perm("source").currentDP).toBe(before + 4000);
  });
});
