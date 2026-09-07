# Committed BT21 KB query results

Command per card: `node tools/kb/query.mjs card <CARD-ID>`. Source: committed `data/kb`; collected 2026-09-06.

## BT21-001

```text
BT21-001 Gigimon
  Q&A (3):
    Q4516 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q4517 (2025-04-04): A Digimon that has this card in its digivolution cards attacks, and a security check was performed on my opponent's security stack. If the attacking Digimon with this card in its digivolution cards digivolves into a Digimon with <Security A. +1> using this card's inherited effect, is another security check performed?
      A: Yes, another security check is performed.
    Q4518 (2025-04-04): I use a Digimon that has this card in its digivolution cards to perform a security check on my opponent's security stack, then I use this Digimon's inherited effect to digivolve into BT21-024 [Cyberdramon]. What card is trashed by BT21-024 [Cyberdramon]'s [When Digivolving] effect at such times?
      A: The top card of the security stack. Upon a security check, the checked card is already considered to be removed from the security stack, therefore that card won't be trashed.
      related: BT21-024
```

## BT21-002

```text
BT21-002 Gurimon
  Q&A (1):
    Q4519 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-003

```text
BT21-003 Yokomon
  (no knowledge-base entries)
```

## BT21-004

```text
BT21-004 Koromon
  (no knowledge-base entries)
```

## BT21-005

```text
BT21-005 Swipemon
  (no knowledge-base entries)
```

## BT21-006

```text
BT21-006 Tsumemon
  (no knowledge-base entries)
```

## BT21-007

```text
BT21-007 Agumon
  (no knowledge-base entries)
```

## BT21-008

```text
BT21-008 Elizamon
  Q&A (1):
    Q4520 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

## BT21-009

```text
BT21-009 Gatchmon
  (no knowledge-base entries)
```

## BT21-010

```text
BT21-010 Gammamon
  Q&A (2):
    Q5210 (2025-10-03): I have 2 or fewer security cards or 3 or more [Hero] trait Tamers with different names. Can I activate this card's [Your Turn] effect at the same time as an effect such as P-103 [Offense Training]'s effect that digivolves?
      A: Yes, you can.
      related: P-103
    Q6944 (2026-08-18): I used a DUAL card with the name Siriusmon on its Digimon side as an Option card from my hand. Can I then use Arts Digivolve to digivolve this card into the card I used, ignoring digivolution requirements?
      A: No, you can't. A used Option card is treated as not being in any area until its [Main] effect has been resolved and the card would be trashed. You can’t ignore digivolution requirements because it isn't treated as a card in the hand.
```

## BT21-011

```text
BT21-011 Shoutmon
  Q&A (1):
    Q4521 (2025-04-04): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a card with the [Xros Heart] or [Hero] trait?
      A: No, it doesn’t trigger.
```

## BT21-012

```text
BT21-012 Flamemon
  (no knowledge-base entries)
```

## BT21-013

```text
BT21-013 Agunimon
  Q&A (7):
    Q4522 (2025-04-04): If I use this card's [When Digivolving] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q6671 (2026-06-19): Does the digivolution requirement that this card digivolve from a Tamer mean the Tamer that becomes a digivolution card is treated as if it is a Digimon when digivolving?
      A: No. Digivolve from the Tamer as such, and do not treat it as if it is a digivolving Digimon. "When digivolving" effects and "when a Digimon digivolves" effects don't trigger. Additionally, if a "Digimon can't digivolve" effect has activated, you can still digivolve from a Tamer with this digivolve requirement.
    Q6672 (2026-06-19): Do I perform a digivolution bonus draw even if I digivolve from a Tamer?
      A: Yes, you do. A digivolution bonus draw is performed for any kind of digivolution.
    Q6673 (2026-06-19): If this card digivolves from a Tamer that was played this turn, can it attack this turn?
      A: No, it can't. A card cannot attack on the turn it is played, even if it digivolves from a card placed on the field. It can only attack if it was not played that turn.
    Q6674 (2026-06-19): Is a Tamer card placed under a Digimon considered a digivolution card?
      A: Yes, it is. If the Digimon leaves the field, that Tamer is trashed like normal digivolution cards.
    Q6675 (2026-06-19): Does a Digimon gain the security effects in the lower text of a Tamer card in its digivolution cards?
      A: No, it does not.
    Q6676 (2026-06-19): Does a Digimon gain the inherited effects in the lower text of a Tamer card in its digivolution cards?
      A: Yes, it does.
```

## BT21-014

```text
BT21-014 BurningGreymon
  Q&A (9):
    Q4523 (2025-04-04): What order do an effect that triggers when a card is removed from a security stack and a [Security] effect on a checked card activate when they trigger simultaneously upon a security check?
      A: The [Security] effect will activate first. Upon a security check, a [Security] effect will immediately activate without pending activation.
    Q4524 (2025-06-13): [Agunimon] is in this card's digivolution cards. If this card attacks and I use its [Your Turn] effect to digivolve into BT21-020 [Aldamon], is the digivolution cost reduced by a total of 2?
      A: Yes, the digivolution cost will be reduced by a total of 2.
      related: BT21-020
    Q4525 (2025-04-04): This card attacks and I perform a security check on my opponent. If I then use this card's [Your Turn] effect to digivolve into a Digimon card with <Security A. +1>, is another security check performed?
      A: Yes, another security check is performed.
    Q6677 (2026-06-19): Does the digivolution requirement that this card digivolve from a Tamer mean the Tamer that becomes a digivolution card is treated as if it is a Digimon when digivolving?
      A: No. Digivolve from the Tamer as such, and do not treat it as if it is a digivolving Digimon. "When digivolving" effects and "when a Digimon digivolves" effects don't trigger. Additionally, if a "Digimon can't digivolve" effect has activated, you can still digivolve from a Tamer with this digivolve requirement.
    Q6678 (2026-06-19): Do I perform a digivolution bonus draw even if I digivolve from a Tamer?
      A: Yes, you do. A digivolution bonus draw is performed for any kind of digivolution.
    Q6679 (2026-06-19): If this card digivolves from a Tamer that was played this turn, can it attack this turn?
      A: No, it can't. A card cannot attack on the turn it is played, even if it digivolves from a card placed on the field. It can only attack if it was not played that turn.
    Q6680 (2026-06-19): Is a Tamer card placed under a Digimon considered a digivolution card?
      A: Yes, it is. If the Digimon leaves the field, that Tamer is trashed like normal digivolution cards.
    Q6681 (2026-06-19): Does a Digimon gain the security effects in the lower text of a Tamer card in its digivolution cards?
      A: No, it does not.
    Q6682 (2026-06-19): Does a Digimon gain the inherited effects in the lower text of a Tamer card in its digivolution cards?
      A: Yes, it does.
```

## BT21-015

```text
BT21-015 Cyclonemon
  (no knowledge-base entries)
```

## BT21-016

```text
BT21-016 Shoutmon (King Version)
  (no knowledge-base entries)
```

## BT21-017

```text
BT21-017 Dimetromon
  Q&A (1):
    Q4526 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

## BT21-018

```text
BT21-018 DoGatchmon
  Q&A (3):
    Q4527 (2025-06-13): This card has 3 different cards in its App Fusion requirements. What combinations are possible for App Fusion?
      A: App Fusion is possible with the following combinations. ●[Gatchmon] with [Navimon] link card ●[Gatchmon] with [Tweetmon] link card ●[Navimon] with [Gatchmon] link card ●[Navimon] with [Tweetmon] link card ●[Tweetmon] with [Gatchmon] link card ●[Tweetmon] with [Navimon] link card
    Q4528 (2025-04-04): I link BT21-018 [DoGatchmon] with this card and use its effect to attack. Can I then use the effect on the linked BT21-018 [DoGatchmon] to attack?
      A: No, you can't use the effect on the linked BT21-018 [DoGatchmon] to attack. A new attack declaration can't be made during an attack. In this case, this card's [Your Turn] effect and BT21-018 [DoGatchmon]'s [When Linking] effect trigger simultaneously, and this card's [Your Turn] effect is used to attack. BT21-018 [DoGatchmon]'s [When Linking] effect can be activated before the counter timing, but because you can't declare another attack during an attack, you won't be able to attack using the linked BT21-018 [DoGatchmon]'s [When Linking] effect, even if you activate it.
    Q5443 (2025-11-21): I used this card's [When Attacking] effect to link BT21-018 [DoGatchmon]. At such times, can I use BT21-018 [DoGatchmon]'s link effect to attack?
      A: No, you can't. A new attack declaration can't be made during an attack.
```

## BT21-019

```text
BT21-019 BetelGammamon
  (no knowledge-base entries)
```

## BT21-020

```text
BT21-020 Aldamon
  Q&A (1):
    Q4524 (2025-06-13): [Agunimon] is in this card's digivolution cards. If this card attacks and I use its [Your Turn] effect to digivolve into BT21-020 [Aldamon], is the digivolution cost reduced by a total of 2?
      A: Yes, the digivolution cost will be reduced by a total of 2.
```

## BT21-021

```text
BT21-021 OmniShoutmon
  Q&A (4):
    Q4529 (2025-04-04): Can I use this card's [End of Attack] effect to delete this card without playing a card?
      A: No, you can't.
    Q4530 (2025-04-04): If I use this card's [End of Attack] effect to play a Tamer card and then delete this card, can I use <Save> to place this card under that Tamer?
      A: Yes, you can.
    Q4727 (2025-06-13): I used this card's [End of Attack] effect to declare playing BT19-014 [Shoutmon EX6] from my hand. At such times, can I declare a DigiXros and place this card itself that activated the [End of Attack] effect under BT19-014 [Shoutmon EX6]?
      A: Yes, you can. If you do, this card will be considered removed before its [End of Attack] effect deletes it, therefore this effect will no longer have a deletion target.
      related: BT19-014
    Q4728 (2025-06-13): I used this card's [End of Attack] effect to play a Digimon card with the [Xros Heart] or [Hero] trait from my hand. At such times, can I use BT21-083 [Taiki Kudo]'s [Your Turn] effect to attack with that played Digimon?
      A: No, it can't attack. An attack will still be occurring until all of the End of Attack processing is resolved, therefore a new attack can't be declared.
      related: BT21-083
```

## BT21-022

```text
BT21-022 Canoweissmon
  Q&A (2):
    Q4531 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4532 (2025-04-04): Can I trash just 2 digivolution cards for the conditions of this card's inherited effect?
      A: No, you can't. A "by doing X" condition can't be met if only some of the required actions are performed. The conditions for this inherited effect require you to trash the specified number of digivolution cards.
```

## BT21-023

```text
BT21-023 Globemon
  Errata (2025-04-18):
    notes:  Read as the errata when playing.
  Q&A (1):
    Q4533 (2025-04-04): Can I use this card's [On Play] [When Digivolving] effect to link a card that doesn't have <Link>?
      A: No, you can't.
```

## BT21-024

```text
BT21-024 Cyberdramon
  Q&A (2):
    Q4518 (2025-04-04): I use a Digimon that has this card in its digivolution cards to perform a security check on my opponent's security stack, then I use this Digimon's inherited effect to digivolve into BT21-024 [Cyberdramon]. What card is trashed by BT21-024 [Cyberdramon]'s [When Digivolving] effect at such times?
      A: The top card of the security stack. Upon a security check, the checked card is already considered to be removed from the security stack, therefore that card won't be trashed.
    Q4534 (2025-06-13): Can I process the part of the effect after "then" in this card's [On Play] [When Digivolving] effect even if the "if" condition in the 1st process isn't met?
      A: Yes, you can process it. Even if your opponent has more than 5 security cards, this card's [On Play] [When Digivolving] effect will trash their top security card.
```

## BT21-025

```text
BT21-025 Lamiamon
  Q&A (1):
    Q4535 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

## BT21-026

```text
BT21-026 WarGreymon
  (no knowledge-base entries)
```

## BT21-027

```text
BT21-027 Shoutmon DX
  (no knowledge-base entries)
```

## BT21-028

```text
BT21-028 Siriusmon
  Q&A (1):
    Q4536 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-029

```text
BT21-029 Medusamon
  Q&A (3):
    Q4537 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
    Q4538 (2026-02-06): Which player's token does this card's [All Turns] effect play as an opponent's Digimon?
      A: The token of the player that activated this card's [All Turns] effect is played as an opponent's Digimon. If the token played by this effect is removed from the field or the game ends, the token is returned to that player.
    Q4539 (2025-04-04): Can I use this card's [All Turns] effect to play a [Petrification] Token during the turn I activated BT8-097 [Crimson Blaze]'s [Main] effect?
      A: Yes, you can. This card's [All Turns] effect plays one of your cards. Cards can be played by your effects even after a "your opponent can't play Digimon by effects" effect has activated.
      related: BT8-097
```

## BT21-030

```text
BT21-030 Shoutmon X7: Superior Mode
  Q&A (3):
    Q4540 (2025-04-04): What happens if a Digimon with 10 or fewer cards stacked with it is chosen for this card's [On Play] [When Digivolving] effect?
      A: The top card is trashed until there are no more stacked cards. Once there is 1 card left, it isn't considered to have "stacked cards," therefore no more are trashed.
    Q4541 (2025-04-04): What happens if this card's [On Play] [When Digivolving] effect trashes stacked cards and the Digimon becomes a Digimon without DP?
      A: It's trashed upon the rule check timing. This trashing isn't considered trashing from the battle area.
    Q4542 (2025-04-04): What happens if this card's [On Play] [When Digivolving] effect trashes stacked cards and the Digimon becomes an Option card?
      A: It's trashed upon the rule check timing. This trashing isn't considered trashing from the battle area.
```

## BT21-031

```text
BT21-031 Sangomon
  Q&A (2):
    Q4543 (2025-04-04): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a card with the [Mollusk] or [Aquatic] trait?
      A: No, it doesn’t trigger.
    Q4876 (2025-07-04): If I use this card's {Hand} [Main] effect to digivolve BT21-031 [Sangomon] into this card, ignoring digivolution requirements, does the combination with BT21-031 [Sangomon]'s effect make the digivolution cost 2?
      A: Yes, the digivolution cost is 2.
```

## BT21-032

```text
BT21-032 Veemon
  Q&A (1):
    Q4544 (2025-04-04): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a card with the [Armor Form] or [Hero] trait?
      A: No, it doesn’t trigger.
```

## BT21-033

```text
BT21-033 Floramon
  (no knowledge-base entries)
```

## BT21-034

```text
BT21-034 Kiwimon
  (no knowledge-base entries)
```

## BT21-035

```text
BT21-035 Flamedramon
  (no knowledge-base entries)
```

## BT21-036

```text
BT21-036 Magnamon
  (no knowledge-base entries)
```

## BT21-037

```text
BT21-037 Lighdramon
  (no knowledge-base entries)
```

## BT21-038

```text
BT21-038 Deramon
  (no knowledge-base entries)
```

## BT21-039

```text
BT21-039 Gryphonmon
  (no knowledge-base entries)
```

## BT21-040

```text
BT21-040 Agumon
  Q&A (2):
    Q5211 (2025-10-03): My opponent has a level 6 or higher Digimon, or I have 3 or more [Hero] trait Tamers with different names. Can I activate this card's [Your Turn] effect at the same time as an effect such as P-105 [Physical Training]'s effect that digivolves?
      A: Yes, you can.
      related: P-105
    Q6246 (2026-05-08): I used a DUAL card with the name [ShineGreymon] on its Digimon side as an Option card from my hand. Can I then use Arts Digivolve to digivolve this card into the card I used, ignoring digivolution requirements?
      A: No, you can't. A used Option card is treated as not being in any area until its [Main] effect has been resolved and the card would be trashed. You can’t ignore digivolution requirements because it isn't treated as a card in the hand.
```

## BT21-041

```text
BT21-041 Calendamon
  (no knowledge-base entries)
```

## BT21-042

```text
BT21-042 GeoGreymon
  (no knowledge-base entries)
```

## BT21-043

```text
BT21-043 Sociamon
  (no knowledge-base entries)
```

## BT21-044

```text
BT21-044 RizeGreymon
  Q&A (11):
    Q4545 (2026-03-13): What does an "is also treated as a Digimon with X000 DP" effect do, exactly?
      A: It causes that card to also be treated as a Digimon with X000 DP. For example, if a Tamer is also treated as a Digimon, it can attack like a standard Digimon, and it will gain inherited effects from cards stacked under it. However, even if a Tamer is played and then treated as a Digimon in the same turn, it can't attack during that turn.
    Q4546 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, is it no longer considered a Tamer?
      A: No, it is treated as both a Digimon and a Tamer.
    Q4547 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect and it activates an effect, is it treated as both a Digimon effect and a Tamer effect?
      A: Yes, it's treated as an effect of both. Because the card is treated as both a Digimon and a Tamer, the activated effect is treated as both a Digimon effect and a Tamer effect.
    Q4548 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, then another effect causes its DP to become 0, is it deleted upon a rule check?
      A: Yes, it's deleted upon the rule check timing.
    Q4549 (2025-04-04): If this card's [On Play] [When Digivolving] effect is used to treat [Marcus Damon] as a Digimon, can I use the part of the effect after "then" to attack using that [Marcus Damon]?
      A: Yes, it can attack.
    Q4550 (2025-04-04): If this card's [On Play] [When Digivolving] effect is used to treat [Marcus Damon] as a Digimon, can I choose to not attack using the part of the effect after "then"?
      A: Yes, you can.
    Q4551 (2025-04-04): Does this card's [All Turns] effect also trigger when a [Marcus Damon] treated as a Digimon is deleted?
      A: Yes, it triggers.
    Q6019 (2026-05-08): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, and later it gains another "is also treated as a Digimon with X000 DP" effect, what happens?
      A: If an effect has triggered and the card is affected by a "is also treated as a Digimon with X000 DP" effect, the play cost, level, and DP are overwritten by the newer effect. However, if an effect has already activated and the card is affected by a "is also treated as a Digimon with X000 DP" effect, the already activated effect will be overwritten. Any other effects such as <Rush> that are later gained will be added.
    Q6020 (2026-03-13): Can I gain memory using an effect on a Tamer that's treated as a Digimon with X000 DP due to an effect while my opponent has "your opponent can't gain memory other than by Tamer effects" activated?
      A: Yes, you can. When an effect is activated on a card that's treated as both a Digimon and a Tamer, the effect is treated as both a Digimon effect and a Tamer effect, therefore you can gain memory.
    Q6021 (2026-03-13): If an opponent's card has "isn't affected by Digimon effects" and it's chosen for an "is also treated as a Digimon with X000 DP" Tamer effect that treats it as a Digimon, will the chosen opponent Digimon be affected by effects?
      A: No, it won't be affected by effects. When an effect is activated on a card that's treated as both a Digimon and a Tamer, the effect is treated as both a Digimon effect and a Tamer effect, therefore the chosen opponent Digimon won't be affected by effects.
    Q6109 (2026-03-13): I have this card and 1 [Marcus Damon] in the battle area. I place BT21-044 [RizeGreymon] in the battle area by playing or digivolving, and the memory moved to 1 or more on my opponent's side. Can I use BT21-044 [RizeGreymon]'s [On Play] [When Digivolving] effect to have 1 of my Digimon attack, resolve the attack, then use this card's [End of Your Turn] effect to have 1 of my Digimon attack?
      A: Yes, you can. Even if you pay a cost and the memory moves to 1 or more on the opponent's side during the main phase, first any effects that triggered during that timing must resolve, then the end of the turn timing occurs. In this case, once all of the attacks from [RizeGreymon]'s [On Play] [When Digivolving] effect have resolved, then the end of the turn timing will occur. Because the attack has already resolved and isn't currently occurring, you can activate this card's [End of Your Turn] effect and have 1 of your Digimon attack.
```

## BT21-045

```text
BT21-045 ShineGreymon
  (no knowledge-base entries)
```

## BT21-046

```text
BT21-046 Dracomon (X Antibody)
  (no knowledge-base entries)
```

## BT21-047

```text
BT21-047 Navimon
  (no knowledge-base entries)
```

## BT21-048

```text
BT21-048 Mushroomon
  Q&A (1):
    Q4552 (2025-04-04): Can I use this card's [On Play] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
```

## BT21-049

```text
BT21-049 Woodmon
  Q&A (2):
    Q4553 (2025-04-04): If it's my opponent's turn, my opponent plays P-163 [Dokugumon], and this card switches from unsuspended to suspended, can I activate this card's [All Turns] effect?
      A: Yes, you can.
      related: P-163
    Q4554 (2025-04-04): Can I use this card's [On Play] [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
```

## BT21-050

```text
BT21-050 Cherrymon
  Q&A (2):
    Q4555 (2025-04-04): If my opponent's ST18-03 [Falcomon] attacks and this card switches from unsuspended to suspended, can I activate this card's [Opponent's Turn] effect?
      A: Yes, you can.
      related: ST18-03
    Q4556 (2025-04-04): Can I use this card's [On Play] [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
      A: Yes, either can be suspended.
```

## BT21-051

```text
BT21-051 Puppetmon
  (no knowledge-base entries)
```

## BT21-052

```text
BT21-052 Examon (X Antibody)
  (no knowledge-base entries)
```

## BT21-053

```text
BT21-053 Watchmon
  (no knowledge-base entries)
```

## BT21-054

```text
BT21-054 Shotmon
  Q&A (4):
    Q4557 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4558 (2025-04-04): This card with BT21-054 [Shotmon] as a link card is in the battle area. What happens if this card digivolves into EX7-043 [Tankmon] and no longer meets BT21-054 [Shotmon]'s link requirements?
      A: The BT21-054 [Shotmon] linked with this card is trashed upon the rule check timing.
      related: EX7-043
    Q4578 (2025-04-04): This card with BT21-054 [Shotmon] as a link card is in the battle area. What happens if this card digivolves into EX7-044 [Gigadramon] and no longer meets BT21-054 [Shotmon]'s link requirements?
      A: The BT21-054 [Shotmon] linked with this card is trashed upon the rule check timing.
      related: EX7-044
    Q4585 (2025-04-04): This card with BT21-054 [Shotmon] as a link card is in the battle area. What happens if this card digivolves into EX7-048 [Gundramon] and no longer meets BT21-054 [Shotmon]'s link requirements?
      A: The BT21-054 [Shotmon] linked with this card is trashed upon the rule check timing.
      related: EX7-048
```

## BT21-055

```text
BT21-055 Sunarizamon
  Q&A (2):
    Q4559 (2025-04-04): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a card with the [Mineral] or [Rock] trait?
      A: No, it doesn’t trigger.
    Q5091 (2025-09-05): If I use this card's {Hand} [Main] effect to digivolve BT21-055 [Sunarizamon] into this card, ignoring digivolution requirements, does the combination with BT21-055 [Sunarizamon]'s effect make the digivolution cost 2?
      A: Yes, the digivolution cost is 2.
```

## BT21-056

```text
BT21-056 Vemmon
  Q&A (1):
    Q4560 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-057

```text
BT21-057 Greymon
  Q&A (1):
    Q4561 (2025-06-13): Can I use this card's [On Play] [When Digivolving] effect to give "[Start of Your Main Phase] This Digimon attacks" to a Digimon that isn't affected by effects?
      A: You can give that effect to such Digimon, but if the Digimon isn't affected by effects upon the trigger timing, the gained effect won't trigger.
```

## BT21-058

```text
BT21-058 Snatchmon
  Q&A (1):
    Q4562 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-059

```text
BT21-059 Timemon
  (no knowledge-base entries)
```

## BT21-060

```text
BT21-060 Destromon
  Q&A (4):
    Q4563 (2025-04-04): What does a "can't trash stacked cards" effect do, exactly?
      A: This effect prevents cards stacked on top from being trashed by <De-Digivolve> or other effects, and cards stacked on the bottom can't be trashed by effects such as those that trash digivolution cards.
    Q4564 (2025-04-04): Can I return just 1 [Vemmon] to the bottom of the deck for the conditions of this card's inherited effect?
      A: No, you can't. A "by doing X" condition can't be met if only some of the required actions are performed. The conditions for this inherited effect require you to return the specified number of cards to the bottom of the deck.
    Q4729 (2025-06-13): What does "end the attack" mean, exactly?
      A: After this effect activates, the current timing makes a transition to the end of attack timing. For example, if this effect activates during the attack declaration timing, it will make a transition to the end of attack timing. A transition to the counter timing or block timing won't occur, and the attack won't succeed.
    Q4730 (2025-06-13): Can an "end the attack" effect end an attack by a Digimon that isn't affected by effects?
      A: Yes, such attacks can be ended. "End the attack" effects are effects that change the timing, they don't affect an attacking Digimon.
```

## BT21-061

```text
BT21-061 MetalGreymon
  Q&A (5):
    Q4565 (2025-06-13): If this card's [Your Turn] effect triggers when another Digimon with the [ADVENTURE] trait is played or another of my Digimon digivolves into an [ADVENTURE] trait Digimon, can I choose to not activate it?
      A: No, you can't. You must give <Alliance> to 1 of your Digimon.
    Q4566 (2025-04-04): Can I choose different Digimon for the Digimon that gains <Alliance> and the Digimon that attacks for this card's [Your Turn] effect?
      A: Yes, you can.
    Q4567 (2025-04-04): After my Digimon gains <Alliance> with this card's [Your Turn] effect, can I choose to not attack for the part of the effect after "then"?
      A: Yes, you can.
    Q4568 (2025-04-04): My Tamer has 4 colors. If this card's [On Play] [When Digivolving] effect activates, do I perform <De-Digivolve 2>?
      A: No. You perform <De-Digivolve 1> twice, not <De-Digivolve 2>. When performing <De-Digivolve 2>, the top 2 cards are considered to be trashed at the same time, but when performing <De-Digivolve 1> twice, the top 2 cards are trashed 1 at a time. For example, if using <De-Digivolve 2> to simultaneously trash the top 2 cards of a suspended Digimon and the 2nd card trashed is BT15-047 [Kabuterimon], its effect won't activate. However, if performing <De-Digivolve 1> twice and the Digimon becomes BT15-047 [Kabuterimon] after the 1st instance of <De-Digivolve 1> trashes a card, it won't be affected by the 2nd instance of <De-Digivolve 1> and won't be trashed.
      related: BT15-047
    Q4731 (2025-06-13): Can I process the part of the effect after "then" in this card's [Your Turn] effect even if the "if" condition in the 1st process isn't met?
      A: Yes, you can process it. Even if your other Digimon don't have the [ADVENTURE] trait, this card's [Your Turn] effect will allow 1 of your Digimon to attack.
```

## BT21-062

```text
BT21-062 Galacticmon
  Q&A (4):
    Q4569 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4570 (2025-04-04): Can I place just 3 cards with [Vemmon] in their texts as this Digimon's bottom digivolution cards for the conditions of this card's [When Digivolving] effect?
      A: No, you can't. A "by doing X" condition can't be met if only some of the required actions are performed. The conditions for this [When Digivolving] effect require you to place the specified number of cards as digivolution cards.
    Q4571 (2025-04-04): Can I return just 3 [Vemmon] from digivolution cards to the bottom of the deck for the conditions of this card's [All Turns] effect?
      A: No, you can't. A "by doing X" condition can't be met if only some of the required actions are performed. You must return the specified number of digivolution cards to the bottom of the deck for the conditions of this card's [All Turns] effect.
    Q6932 (2026-06-19): My Digimon digivolved into BT21-062 [Galacticmon] and I used its [When Digivolving] effect to place Vemmon in digivolution cards. At such times, can I activate this card's <Delay> effect and digivolve that Galacticmon into EX11-046 [Galacticmon]?
      A: Yes, you can.
      related: EX11-046
```

## BT21-063

```text
BT21-063 Gumdramon
  Q&A (1):
    Q4572 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-064

```text
BT21-064 Guilmon
  Q&A (2):
    Q5758 (2025-12-25): This card's inherited effect and BT21-064 [Guilmon]'s inherited effect triggered simultaneously when BT21-068 [Growlmon] with this card and BT21-064 [Guilmon] in its digivolution cards was deleted. At such times, if I activate this card's effect first and BT21-068 [Growlmon] is returned from the trash to the hand, can I then activate BT21-064 [Guilmon]'s inherited effect?
      A: No, you can't activate it. When a Digimon is deleted and an [On Deletion] effect on a digivolution card is triggered, it will only be pending activation for the Digimon card with that digivolution card. If a card with an effect that's pending activation leaves that area before the effect activates, the effect can no longer be activated. In this case, if BT21-068 [Growlmon] is deleted and an [On Deletion] effect on a digivolution card is triggered, the effect will only be pending activation for BT21-068 [Growlmon]. If the deleted BT21-068 [Growlmon] leaves the trash, the inherited [On Deletion] effect that was pending activation can no longer be activated.
      related: BT21-068
    Q5759 (2026-02-06): This card's inherited effect and BT21-068 [Growlmon]'s inherited effect triggered simultaneously when BT21-076 [WarGrowlmon] with this card and BT21-068 [Growlmon] in its digivolution cards was deleted. At such times, if I activate this card's effect first and BT21-068 [Growlmon] is returned from the trash to the hand, can I then activate BT21-068 [Growlmon]'s inherited effect?
      A: Yes, you can. When a Digimon is deleted and an [On Deletion] effect on a digivolution card is triggered, it will only be pending activation for the Digimon card with that digivolution card. You can activate BT21-068 [Growlmon]'s inherited effect even if BT21-068 [Growlmon] is returned to the hand by this card's inherited effect.
      related: BT21-068
```

## BT21-065

```text
BT21-065 Ghostmon
  Q&A (2):
    Q4573 (2025-04-04): Does this card's [Your Turn] effect trigger when this card is in the breeding area and would digivolve into a card with the [Ghost] trait?
      A: No, it doesn’t trigger.
    Q5334 (2025-10-03): If I use this card's {Hand} [Main] effect to digivolve BT21-065 [Ghostmon] into this card, ignoring digivolution requirements, does the combination with BT21-065 [Ghostmon]'s effect make the digivolution cost 2?
      A: Yes, the digivolution cost is 2.
```

## BT21-066

```text
BT21-066 Arresterdramon
  Q&A (1):
    Q4574 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-067

```text
BT21-067 Garurumon
  (no knowledge-base entries)
```

## BT21-068

```text
BT21-068 Growlmon
  Q&A (4):
    Q4575 (2025-04-04): My opponent has a Digimon with 4000 DP or less. Can I meet the "if this effect didn't delete" condition in this card's [On Play] [When Digivolving] effect by not choosing a card to delete?
      A: No, you can't. If your opponent has a Digimon with 4000 DP or less, you must choose that card and delete it.
    Q4576 (2025-04-04): My opponent has a Digimon with 4000 DP or less. Can I meet the "if this effect didn't delete" condition in this card's [On Play] [When Digivolving] effect by choosing an opponent's Digimon with 4000 DP or less and an effect that prevents deletion?
      A: Yes, you can.
    Q5758 (2025-12-25): This card's inherited effect and BT21-064 [Guilmon]'s inherited effect triggered simultaneously when BT21-068 [Growlmon] with this card and BT21-064 [Guilmon] in its digivolution cards was deleted. At such times, if I activate this card's effect first and BT21-068 [Growlmon] is returned from the trash to the hand, can I then activate BT21-064 [Guilmon]'s inherited effect?
      A: No, you can't activate it. When a Digimon is deleted and an [On Deletion] effect on a digivolution card is triggered, it will only be pending activation for the Digimon card with that digivolution card. If a card with an effect that's pending activation leaves that area before the effect activates, the effect can no longer be activated. In this case, if BT21-068 [Growlmon] is deleted and an [On Deletion] effect on a digivolution card is triggered, the effect will only be pending activation for BT21-068 [Growlmon]. If the deleted BT21-068 [Growlmon] leaves the trash, the inherited [On Deletion] effect that was pending activation can no longer be activated.
      related: BT21-064
    Q5759 (2026-02-06): This card's inherited effect and BT21-068 [Growlmon]'s inherited effect triggered simultaneously when BT21-076 [WarGrowlmon] with this card and BT21-068 [Growlmon] in its digivolution cards was deleted. At such times, if I activate this card's effect first and BT21-068 [Growlmon] is returned from the trash to the hand, can I then activate BT21-068 [Growlmon]'s inherited effect?
      A: Yes, you can. When a Digimon is deleted and an [On Deletion] effect on a digivolution card is triggered, it will only be pending activation for the Digimon card with that digivolution card. You can activate BT21-068 [Growlmon]'s inherited effect even if BT21-068 [Growlmon] is returned to the hand by this card's inherited effect.
      related: BT21-064
```

## BT21-069

```text
BT21-069 GulusGammamon
  (no knowledge-base entries)
```

## BT21-070

```text
BT21-070 Gossipmon
  (no knowledge-base entries)
```

## BT21-071

```text
BT21-071 Scopemon
  Q&A (2):
    Q4577 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4578 (2025-04-04): This card with BT21-054 [Shotmon] as a link card is in the battle area. What happens if this card digivolves into EX7-044 [Gigadramon] and no longer meets BT21-054 [Shotmon]'s link requirements?
      A: The BT21-054 [Shotmon] linked with this card is trashed upon the rule check timing.
      related: BT21-054, EX7-044
```

## BT21-072

```text
BT21-072 Arresterdramon: Superior Mode
  Q&A (2):
    Q4579 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4580 (2025-04-04): Can I use this card's [When Digivolving] effect to attack even when this card is suspended?
      A: Yes, it can attack.
```

## BT21-073

```text
BT21-073 Charismon
  Q&A (4):
    Q4581 (2025-04-04): Can I use this card's [On Play] [When Digivolving] effect to link a card that doesn't have <Link>?
      A: No, you can't.
    Q4582 (2025-06-13): Can I use this card's [Your Turn] effect to give "[Start of Your Main Phase] This Digimon attacks" to a Digimon that isn't affected by effects?
      A: You can give that effect to such Digimon, but if the Digimon isn't affected by effects upon the trigger timing, the gained effect won't trigger.
    Q4583 (2025-09-05): If a Digimon's maximum links is increased using <Link +1> and has a total of 2 link cards including this card, then it would be removed from the battle area, can I choose from among those cards to trash for this card's <Link> effect?
      A: Yes, you can choose 1 card from among that Digimon's link cards and trash it.
    Q5000 (2025-09-05): Can I also activate this card's link effect by trashing this card itself when it's a link card?
      A: Yes, you can.
```

## BT21-074

```text
BT21-074 Satellamon
  Q&A (2):
    Q4584 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4585 (2025-04-04): This card with BT21-054 [Shotmon] as a link card is in the battle area. What happens if this card digivolves into EX7-048 [Gundramon] and no longer meets BT21-054 [Shotmon]'s link requirements?
      A: The BT21-054 [Shotmon] linked with this card is trashed upon the rule check timing.
      related: BT21-054, EX7-048
```

## BT21-075

```text
BT21-075 SkullGreymon
  (no knowledge-base entries)
```

## BT21-076

```text
BT21-076 WarGrowlmon
  (no knowledge-base entries)
```

## BT21-077

```text
BT21-077 Regulusmon
  Q&A (3):
    Q4586 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4587 (2025-06-13): Can I use this card's [On Play] [When Digivolving] effect to give "[Start of Your Main Phase] This Digimon attacks" to a Digimon that isn't affected by effects?
      A: You can give that effect to such Digimon, but if the Digimon isn't affected by effects upon the trigger timing, the gained effect won't trigger.
    Q5001 (2025-09-05): I chose my opponent's BT16-048 [TyrantKabuterimon] for this card's [On Play] [When Digivolving] effect. If BT16-048 [TyrantKabuterimon] then attacks and is suspended at the start of the main phase, does its gained <Collision> activate?
      A: No, <Collision> doesn't activate. As soon as BT16-048 [TyrantKabuterimon] suspends, its [All Turns] effect prevents it from being affected by your effects, and <Collision> doesn't activate.
      related: BT16-048
```

## BT21-078

```text
BT21-078 WereGarurumon
  Q&A (4):
    Q4588 (2025-06-13): If this card's [Your Turn] effect triggers when another Digimon with the [ADVENTURE] trait is played or another of my Digimon digivolves into an [ADVENTURE] trait Digimon, can I choose to not activate it?
      A: No, you can't. You must give <Alliance> to 1 of your Digimon.
    Q4589 (2025-04-04): Can I choose different Digimon for the Digimon that gains <Alliance> and the Digimon that attacks for this card's [Your Turn] effect?
      A: Yes, you can.
    Q4590 (2025-04-04): After my Digimon gains <Alliance> with this card's [Your Turn] effect, can I choose to not attack for the part of the effect after "then"?
      A: Yes, you can.
    Q4732 (2025-06-13): Can I process the part of the effect after "then" in this card's [Your Turn] effect even if the "if" condition in the 1st process isn't met?
      A: Yes, you can process it. Even if your other Digimon don't have the [ADVENTURE] trait, this card's [Your Turn] effect will allow 1 of your Digimon to attack.
```

## BT21-079

```text
BT21-079 Megidramon
  (no knowledge-base entries)
```

## BT21-080

```text
BT21-080 Hiro Amanokawa
  Q&A (1):
    Q4592 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-081

```text
BT21-081 Owen Dreadnought
  Q&A (2):
    Q4593 (2025-04-04): Can I use this card's [End of Your Turn] effect to give <Piercing> to 1 of my Digimon, but then choose to not attack with that Digimon?
      A: No, you can't. The Digimon that was given <Piercing> by this effect must attack if possible.
    Q4594 (2025-04-04): I have 2 copies of this card in the battle area. At the end of my turn, I used the [End of Your Turn] effect on the 1st copy of this card to attack. Can I then use the [End of Your Turn] effect on the 2nd copy of this card to attack?
      A: No, an attack using the 2nd effect isn't possible. A new attack declaration can't be made during an attack. In this case, the [End of Your Turn] effects on both copies of this card trigger simultaneously at the end of your turn, and you use the [End of Your Turn] effect on the 1st copy of this card to attack. The 2nd [End of Your Turn] effect can be activated before the counter timing, but because you can't declare another attack during an attack, you won't be able to attack using the 2nd effect, even if you activate it.
```

## BT21-082

```text
BT21-082 Takuya Kanbara
  Q&A (2):
    Q4595 (2025-04-04): If only this card is in the battle area and I use its [Start of Your Main Phase] effect to digivolve, is the digivolution cost reduced by 1?
      A: Yes, the digivolution cost is reduced by 1.
    Q4596 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

## BT21-083

```text
BT21-083 Taiki Kudo
  Q&A (3):
    Q4597 (2025-04-04): If I use this card's [Start of Your Main Phase] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
    Q4598 (2025-04-04): I have 2 copies of this card in the battle area. The [Your Turn] effects on both copies triggered, and I used the [Your Turn] effect on the 1st copy of this card to attack. Can I then use the [Your Turn] effect on the 2nd copy of this card to attack?
      A: No, an attack using the 2nd effect isn't possible. A new attack declaration can't be made during an attack. In this case, the [Your Turn] effects on both copies trigger, and you use the [Your Turn] effect on the 1st copy of this card to attack. The 2nd [Your Turn] effect can be activated before the counter timing, but because you can't declare another attack during an attack, you won't be able to attack using the 2nd effect, even if you activate it.
    Q4728 (2025-06-13): I used this card's [End of Attack] effect to play a Digimon card with the [Xros Heart] or [Hero] trait from my hand. At such times, can I use BT21-083 [Taiki Kudo]'s [Your Turn] effect to attack with that played Digimon?
      A: No, it can't attack. An attack will still be occurring until all of the End of Attack processing is resolved, therefore a new attack can't be declared.
```

## BT21-084

```text
BT21-084 Haru Shinkai
  Q&A (2):
    Q4599 (2025-04-04): When linking with one of my Digimon that has a [When Linking] effect, this card's [Your Turn] effect activated before that card's [When Linking] effect, and I app fused that Digimon. Can I then activate the linked card's [When Linking] effect?
      A: No, you can't activate it. When a card with an effect that's pending activation leaves its current area while activation is pending, the effect can no longer be activated. In this case, the [When Linking] effect on the linked card triggers upon the link, but it becomes a digivolution card before the effect can activate and is no longer considered a link card, therefore the effect can't activate.
    Q5444 (2025-11-21): This card attacks, and its <Raid> and [When Attacking] effect trigger simultaneously. Then, I first activate the [When Attacking] effect, link [Timemon], and I use BT21-084 [Haru Shinkai]'s [Your Turn] effect to app fuse to [Globemon]. After that, can I activate <Raid> on this card in digivolution cards?
      A: No, you can't. <Raid> has already been lost, therefore it can't be activated. However, when <Raid> and the [When Attacking] effect trigger simultaneously, you can activate <Raid> first and then activate the [When Attacking] effect.
```

## BT21-085

```text
BT21-085 Davis Motomiya
  Q&A (1):
    Q4600 (2025-04-04): I activated the [Your Turn] [Once Per Turn] on P-117 [Veemon] when digivolving it and reduced the digivolution cost by 1. If I then activate this card's [Main] effect and trash a card stacked with that Digimon, can I activate P-117 [Veemon]'s [Your Turn] [Once Per Turn] effect again?
      A: No, you can't activate it. Even if a stacked card is trashed, the [X Per Turn] limit has already been reached for the activated effect.
      related: P-117
```

## BT21-086

```text
BT21-086 Marcus Damon
  (no knowledge-base entries)
```

## BT21-087

```text
BT21-087 Zenith
  Q&A (1):
    Q4601 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
```

## BT21-088

```text
BT21-088 Tagiru Akashi
  Q&A (2):
    Q4602 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4603 (2025-04-04): If I use this card's [Start of Your Main Phase] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
```

## BT21-089

```text
BT21-089 Takato Matsuki
  (no knowledge-base entries)
```

## BT21-090

```text
BT21-090 The Strongest of Brothers
  Q&A (2):
    Q4604 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4733 (2025-06-13): What does "while you have (the specified card) on the field" mean, exactly?
      A: It refers to when you have the specified card in the battle area or breeding area.
```

## BT21-091

```text
BT21-091 Spirit Evolution!
  (no knowledge-base entries)
```

## BT21-092

```text
BT21-092 Can't Turn My Back!
  Q&A (2):
    Q4606 (2025-04-04): If I use this card's [Main] effect to place a Digimon's digivolution cards under 1 of my Tamers, can I choose the order the cards are placed?
      A: Yes, you can choose the order of the cards that are placed.
    Q4607 (2025-04-04): If I use this card's [Main] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
```

## BT21-093

```text
BT21-093 Raging Serpentine
  Q&A (1):
    Q4608 (2025-12-25): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
      A: [Security] effects take precedence for activation. Upon a security check, a [Security] effect will immediately activate without pending activation. For other triggered effects, the turn player activates their effects first.
```

## BT21-094

```text
BT21-094 Armor Digivolution
  (no knowledge-base entries)
```

## BT21-095

```text
BT21-095 Wind Guardians
  Q&A (6):
    Q4609 (2025-04-04): Is the "while you have no face-up security cards" condition met when I have 0 cards in my security stack?
      A: Yes, it is.
    Q4610 (2025-04-04): Can I also activate this card’s [Main] effect when I have 0 cards in my security stack?
      A: Yes, you can. In such cases, you can't add a card from your security stack to your hand, therefore you only place this card in your security stack.
    Q4611 (2025-04-04): What happens to cards placed face up in the security stack by effects?
      A: They become face-up security cards that remain revealed. Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.
    Q4612 (2025-04-04): What happens upon a security check for a security card that is placed face-up?
      A: The check is performed with the card left revealed. Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.
    Q4613 (2025-04-04): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
      A: Yes, it triggers.
    Q4614 (2025-04-04): What happens if I shuffle a security stack that includes security cards placed face-up?
      A: Any face-up cards are placed face down, then you shuffle the cards. After shuffling, all cards are left face-down.
```

## BT21-096

```text
BT21-096 The Champion Ultimate Fighter!
  Q&A (9):
    Q4615 (2026-03-13): What does an "is also treated as a Digimon with X000 DP" effect do, exactly?
      A: It causes that card to also be treated as a Digimon with X000 DP. For example, if a Tamer is also treated as a Digimon, it can attack like a standard Digimon, and it will gain inherited effects from cards stacked under it. However, even if a Tamer is played and then treated as a Digimon in the same turn, it can't attack during that turn.
    Q4616 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, is it no longer considered a Tamer?
      A: No, it is treated as both a Digimon and a Tamer.
    Q4617 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect and it activates an effect, is it treated as both a Digimon effect and a Tamer effect?
      A: Yes, it's treated as an effect of both. Because the card is treated as both a Digimon and a Tamer, the activated effect is treated as both a Digimon effect and a Tamer effect.
    Q4618 (2026-03-13): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, then another effect causes its DP to become 0, is it deleted upon a rule check?
      A: Yes, it's deleted upon the rule check timing.
    Q4619 (2025-04-04): If this card's [Main] effect is used to treat [Marcus Damon] as a Digimon, can I use the part of the effect after "then" to attack using that [Marcus Damon]?
      A: Yes, it can attack.
    Q4620 (2025-04-04): If this card's [Main] effect is used to treat [Marcus Damon] as a Digimon, can I choose to not attack using the part of the effect after "then"?
      A: Yes, you can.
    Q6022 (2026-05-08): If a Tamer is also treated as a Digimon using an "is also treated as a Digimon with X000 DP" effect, and later it gains another "is also treated as a Digimon with X000 DP" effect, what happens?
      A: If an effect has triggered and the card is affected by a "is also treated as a Digimon with X000 DP" effect, the play cost, level, and DP are overwritten by the newer effect. However, if an effect has already activated and the card is affected by a "is also treated as a Digimon with X000 DP" effect, the already activated effect will be overwritten. Any other effects such as <Rush> that are later gained will be added.
    Q6023 (2026-03-13): Can I gain memory using an effect on a Tamer that's treated as a Digimon with X000 DP due to an effect while my opponent has "your opponent can't gain memory other than by Tamer effects" activated?
      A: Yes, you can. When an effect is activated on a card that's treated as both a Digimon and a Tamer, the effect is treated as both a Digimon effect and a Tamer effect, therefore you can gain memory.
    Q6024 (2026-03-13): If an opponent's card has "isn't affected by Digimon effects" and it's chosen for an "is also treated as a Digimon with X000 DP" Tamer effect that treats it as a Digimon, will the chosen opponent Digimon be affected by effects?
      A: No, it won't be affected by effects. When an effect is activated on a card that's treated as both a Digimon and a Tamer, the effect is treated as both a Digimon effect and a Tamer effect, therefore the chosen opponent Digimon won't be affected by effects.
```

## BT21-097

```text
BT21-097 App Link
  Q&A (2):
    Q4621 (2025-04-04): Can I use this card's <Delay> effect to link a card that doesn't have <Link>?
      A: No, you can't.
    Q4734 (2025-06-13): What does "while you have (the specified card) on the field" mean, exactly?
      A: It refers to when you have the specified card in the battle area or breeding area.
```

## BT21-098

```text
BT21-098 Ragnarok Cannon
  Q&A (3):
    Q4622 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4623 (2025-04-04): My opponent has a Digimon. Can I meet the "if this effect didn't delete" condition in this card's <Delay> effect by not choosing a card to delete?
      A: No, you can't. If your opponent has a Digimon, you must choose that card and delete it.
    Q4624 (2025-04-04): My opponent has a Digimon. Can I meet the "if this effect didn't delete" condition in this card's <Delay> effect by choosing an opponent's Digimon with an effect that prevents deletion?
      A: Yes, you can.
```

## BT21-099

```text
BT21-099 Xros Up
  Q&A (2):
    Q4625 (2025-06-13): What does a card with "X in its text" refer to?
      A: It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements. For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.
    Q4626 (2025-04-04): If I use this card's [Main] effect to place a card under a Tamer with cards under it, in what order do I place the card?
      A: The card is placed on the bottom of the cards under the Tamer.
```

## BT21-100

```text
BT21-100 The Digimon I Designed
  (no knowledge-base entries)
```

## BT21-101

```text
BT21-101 Gaiamon
  Q&A (1):
    Q4591 (2025-04-04): Can I use this card's [When Digivolving] [When Attacking] effect to link a card that doesn't have <Link>?
      A: No, you can't.
```

## BT21-102

```text
BT21-102 Tai Kamiya
  (no knowledge-base entries)
```
