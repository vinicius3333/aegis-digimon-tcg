import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX11-034.js";
describe("EX11-034 QueenBeemon", () => { it("registers its On Play effect as executable IR", () => { const source = { instanceId: "source", cardId: "EX11-034", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never; expect(getEffectModule("EX11-034")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1); }); });
