import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-12.js";

describe("ST19-12 Familiar Token", () => {
  it("creates the printed Yellow 3000 DP token and resolves its On Deletion effect", async () => {
    const s = setupEngine(
      { 1: { battleArea: [{ card: "AD1-001", dp: 7000, as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tokenDefinition = getCardDefinition("TOKEN-Familiar-Token");
    expect(tokenDefinition).toMatchObject({ dp: 3000, colors: ["Yellow"], isToken: true });

    const primitives = (s.engine as unknown as {
      primitives: {
        playToken(seat: 0, name: string, options: { payCost: false }): Promise<{ permanentId: string } | undefined>;
        deletePermanent(ids: string[]): Promise<number>;
      };
    }).primitives;
    const token = await primitives.playToken(0, "Familiar", { payCost: false });
    expect(token).toBeDefined();

    await primitives.deletePermanent([token!.permanentId]);
    await settle(() => (s.perm("opponent").currentDP ?? 7000) < 7000);
    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === token!.permanentId)).toBe(false);
  });
});
