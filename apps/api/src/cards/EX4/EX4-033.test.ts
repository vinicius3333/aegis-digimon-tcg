import { describe, expect, it } from "vitest";
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
});
