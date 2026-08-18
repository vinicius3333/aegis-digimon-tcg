import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-001.js";
describe("BT2-001 Gigimon",()=>{it("gives +1000 DP while the opponent has 5 cards in trash",async()=>{const s=setupEngine({0:{battleArea:[{card:"BT2-009",as:"host",under:["BT2-001"]}]},1:{trash:["BT1-010","BT1-011","BT1-012","BT1-013","BT1-014"]}});await s.engine.recomputeContinuousEffects();expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP+1000);});});
