import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-033.js";

describe("EX4-033 Terriermon Assistant", () => {
  it("is also treated as Terriermon and gains 4000 DP when an effect suspends it", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Terriermon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectSuspends",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "ModifyDP", amount: 4000 }],
    });
  });
  it("inherited Alliance suspension can digivolve this card into a green multicolor Digimon", () => {
    const inherited = compiled.effects?.filter((entry) => entry.trigger === "YourTurn")[1]?.actions?.[0];
    expect(inherited).toMatchObject({ bySourceKeyword: "Alliance", event: "whenEffectSuspends" });
    expect((inherited as { actions?: unknown[] } | undefined)?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      costDelta: -2,
      optional: true,
    });
    expect((inherited as { actions?: unknown[] } | undefined)?.actions).not.toContainEqual(
      expect.objectContaining({ kind: "Replacement" }),
    );
  });

  it("grants the selected Digimon +4000 when an effect suspends this card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-033", as: "assistant" },
            { card: "BT1-009", as: "beneficiary", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("beneficiary").permanentId);
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("assistant").permanentId], 0);
    await settle(() => s.perm("beneficiary").currentDP === 7000);

    expect(s.perm("beneficiary").currentDP).toBe(7000);
  });
});
