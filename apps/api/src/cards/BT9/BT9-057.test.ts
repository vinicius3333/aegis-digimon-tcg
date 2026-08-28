import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-057.js";

auditEffectlessDigimon({
  cardId: "BT9-057",
  expected: {
    cardId: "BT9-057",
    nameEn: "Bearmon",
    colors: ["Black"],
    kinds: ["Digimon"],
    level: 3,
    playCost: 2,
    dp: 3000,
    evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
    forms: ["Rookie"],
    attributes: ["Vaccine"],
    types: ["Beast"],
  },
  compiled,
  validBase: "BT10-005",
  invalidBase: "BT1-003",
});
