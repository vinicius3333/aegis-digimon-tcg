import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-039.js";

auditEffectlessDigimon({
  cardId: "BT9-039",
  expected: {
    cardId: "BT9-039",
    nameEn: "DarkSuperStarmon",
    colors: ["Yellow", "Black"],
    kinds: ["Digimon"],
    level: 5,
    playCost: 7,
    dp: 9000,
    evoCosts: [
      { color: "Yellow", level: 4, memoryCost: 3 },
      { color: "Black", level: 4, memoryCost: 3 },
    ],
    forms: ["Ultimate"],
    attributes: ["Virus"],
    types: ["Mutant"],
  },
  compiled,
  validBase: "BT9-035",
  invalidBase: "BT9-022",
});
