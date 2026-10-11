# Bot personas

Persona IDs describe presentation and never select a policy, alter its difficulty,
or change a recipe fingerprint. The server resolves an identity from the actual
selected deck; an unavailable requested preset cannot assign its persona to the
replacement. Unknown custom lists use Aegis. Exact catalog matches ignore card
order but preserve quantities and the egg deck.

Curated Tamers must be featured in the recipe, including another printing of the
same character. Ulforce also uses Rina in older recipes because BT11-112 directly
supports the Veedramon line. Other recipes use a principal Digimon portrait instead of an
invented Tamer relationship. The fallback prioritizes the archetype's printed
name, then level and play cost. These are presentation associations, not universal
claims about canonical partners.

The committed card catalog supplies names and the following printed associations:
Rina BT11-112 names Veemon/Veedramon; Tomoro and Kyo ST23-13 names Glowing Dawn;
Kunlun BT26-104 names Shambala/Tentei Hachibushu; Kosuke BT26-096 names Chronomon;
Takato EX2-056 names Gallantmon/Growlmon; Thomas BT13-097 names Gaomon/GaoGamon;
Rika BT19-083 names the Renamon line; Satsuki BT14-086 names Numemon/Monzaemon
and DigiPolice. D-Brigade recipes only select Satsuki when they feature her and
DigiPolice Digimon, such as BT14-056 Commandramon. Koh and Sayo EX5-064 supports
Light Fang/Night Claw, and is used only in recipes that feature the pair. Generic
support such as Analog Youth or Cool Boy never determines a character identity.

Variant selection distinguishes Magnamon Vaccine from Armor, Alphamon Cyber
Sleuth, Phoenixmon Sora/Akiho, Rapidmon Willis/Henry, and GraceNovamon Galaxy.
Other named associations additionally require the selected recipe to feature that
character. Old yellow WarGreymon lists without Tai retain a Digimon identity.

Official references: [Rina](https://world.digimoncard.com/cards/?card_no=BT11-112&search=true),
[Tomoro and Kyo](https://world.digimoncard.com/cards/?card_no=ST23-13&search=true),
[Kunlun](https://world.digimoncard.com/cards/?card_no=BT26-104&search=true), and
[BT26 recipes](https://world.digimoncard.com/products/pack/ver26/) for Chronomon
and Inori/Jupitermon. Portraits reuse existing card-image resolution and its
official fallback. Image failures fall back to initials; decorative portraits
have empty alternative text beside the visible character name and Bot label.

The public schema carries botPersonaId separately from account avatarId. The
lobby and game resolve this same ID, preserving the server's display name for
tournament disambiguation. Narrow player rows use 18-pixel portraits; the lobby
uses 48-pixel portraits. Unknown legacy persona IDs retain the player name and
Bot label without loading arbitrary images.
