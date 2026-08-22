import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST2-05.js";

describe("ST2-05 Ikkakumon", () => {
  it("is registered as complete vanilla IR with catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST2-05"] } });
    await s.ready();
    expect(s.state.players[0]!.battleArea[0]!.baseDP).toBe(getCardDefinition("ST2-05")!.dp);
    expect(getCompiledCard("ST2-05")!.coverage).toBe("full");
  });
});
