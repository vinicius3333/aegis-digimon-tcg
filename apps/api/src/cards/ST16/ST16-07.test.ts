import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-07.js";

describe("ST16-07 Meramon", () => {
  it("gains 1 memory when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-07", as: "meramon" }] } });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("meramon").permanentId], "effect");
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST16-07")).toBe(true);
  });
});
