import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-007.js";

auditEffectlessDigimon({
  cardId: "BT9-007",
  expected: {
    cardId: "BT9-007",
    nameEn: "Minidekachimon",
    colors: ["Red"],
    kinds: ["Digimon"],
    level: 3,
    playCost: 2,
    dp: 3000,
    evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
    forms: ["Rookie"],
    attributes: ["Data"],
    types: ["Mini Dragon"],
    rarity: "C",
    maxCountInDeck: 4,
    imageId: "BT9-007",
  },
  compiled,
  validBase: "BT1-001",
  invalidBase: "BT1-003",
});
