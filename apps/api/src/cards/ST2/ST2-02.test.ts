import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST2-02.js";

describe("ST2-02 Gomamon", () => {
  it("is registered as complete vanilla IR with catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST2-02"] } });
    await s.ready();
    expect(s.state.players[0]!.battleArea[0]!.baseDP).toBe(getCardDefinition("ST2-02")!.dp);
    expect(getCompiledCard("ST2-02")!.coverage).toBe("full");
  });
});
