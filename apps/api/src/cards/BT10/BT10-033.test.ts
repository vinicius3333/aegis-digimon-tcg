import { describe, expect, it } from "vitest"; import { getCardDefinition } from "@aegis/shared"; import "./BT10-033.js";
describe("BT10-033 Shortmon",()=>it("has printed vanilla data",()=>{const d=getCardDefinition("BT10-033")!; expect([d.colors,d.level,d.playCost,d.dp,d.effectText]).toEqual([["Yellow"],4,3,3000,undefined]);}));
