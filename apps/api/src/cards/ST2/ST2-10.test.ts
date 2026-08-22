import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST2-10.js";

describe("ST2-10 Plesiomon", () => {
  it("is registered as complete vanilla IR with catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST2-10"] } });
    await s.ready();
    expect(s.state.players[0]!.battleArea[0]!.baseDP).toBe(getCardDefinition("ST2-10")!.dp);
    expect(getCompiledCard("ST2-10")!.coverage).toBe("full");
  });
});
