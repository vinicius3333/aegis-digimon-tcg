import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import { memoryBoostColorRulings } from "./qaRulings1.testSupport.js";
import "./P-040.js";

memoryBoostTests({
  cardId: "P-040",
  name: "Purple Memory Boost!",
  colorSource: "BT10-079",
  matchingDigimon: "BT10-079",
  offColorDigimon: "BT1-009",
});

memoryBoostColorRulings({
  cardId: "P-040",
  name: "Purple Memory Boost!",
  sameColorOption: "BT10-107",
  colorRequirementQno: "Q4159",
  delayQno: "Q4160",
});
