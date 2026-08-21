import { describe, expect, it } from "vitest"; import { getCardDefinition } from "@aegis/shared"; import "./BT10-037.js";
describe("BT10-037 Weddinmon",()=>it("has printed vanilla data",()=>{const d=getCardDefinition("BT10-037")!; expect([d.colors,d.level,d.playCost,d.dp,d.effectText]).toEqual([["Yellow"],5,7,8000,undefined]);}));
