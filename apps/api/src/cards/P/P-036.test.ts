import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import { memoryBoostColorRulings } from "./qaRulings1.testSupport.js";
import "./P-036.js";

memoryBoostTests({
  cardId: "P-036",
  name: "Blue Memory Boost!",
  colorSource: "BT1-027",
  matchingDigimon: "BT1-027",
  offColorDigimon: "BT1-009",
});

memoryBoostColorRulings({
  cardId: "P-036",
  name: "Blue Memory Boost!",
  sameColorOption: "BT1-101",
  colorRequirementQno: "Q4151",
  delayQno: "Q4152",
});
