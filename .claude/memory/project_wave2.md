---
name: project-wave2-3
description: "Wave 2+3 implementation for 小島開拓誌.html — forge, fishing, dungeon, HP, enemies, weapons"
metadata: 
  node_type: memory
  type: project
  originSessionId: 833538ef-59de-4a7a-b4cf-44a543ee90f2
---

**Wave 2 implemented as of 2026-06-12. Wave 3 implemented as of 2026-06-12.** Core file is `/home/user/桌面/island/小島開拓誌.html`; constants extracted to `lib/data.js`; worldgen extracted to `lib/worldgen.js`. Git repo initialized with 3 commits on master.

**Why:** Scalability and maintainability — single file was growing too large. Future waves (dungeons, combat, metal tiers) need the split.

**How to apply:** Always reference the lib files for data constants; the HTML IIFE accesses them as globals.

## Key additions in Wave 2

- **O.FORGE = 16** — new building object
- **New RESOURCES:** coal ⬛, iron_ore 🟫, iron_ingot ⚙️, rope 🪢, raw_fish 🐟, cooked_fish 🍖
- **New EQUIP_DEF slots:** `feet` (boots 👞) and `hands` (gloves 🧤); also iron_axe, iron_pick, fishing_rod
- **STATIONS:** campfire (objType:O.FIRE) for cooking; forge (objType:O.FORGE) for smelting
- **RECIPES:** rope, fishing_rod, boots, gloves (workbench); cook_fish (campfire); iron_ingot, iron_axe, iron_pick (forge)

## Mechanics

- **Boots:** `speedMul=0.65` in `tryMove` — 35% faster movement
- **Gloves:** `stam*0.6` in `doInteract` — 40% less stamina cost on all interactions
- **Iron pick:** mines MTN tiles (iron_ore + 30% coal), ×2 stone efficiency
- **Iron axe:** ×5 wood efficiency
- **Fishing rod:** face water + interact → raw_fish (1-2); wears rod durability
- **Rock mining:** 20% chance to drop coal when using a pick (non-bare-hand)
- **Campfire cooking:** near fire → craft panel → campfire tab → cook_fish recipe
- **eatFood():** prefers cooked_fish (+50 stam) over food (+30 stam)

## Monument fog
- `onMonument()` calls `W.disc.fill(1); mmDirty=true;` — instantly reveals entire map

## Backward compat (saves)
- `load()` uses `Object.assign({head,body,hand,hands:null,feet:null}, d.equipped||{})` — old saves get null for new slots

## Architecture notes
- `STATIONS` loop in `contextAction` correctly reaches O.FORGE (campfire/O.FIRE is caught earlier by the fire/rest check)
- `renderBagPanel` shows 6 slots: head, body, hand, weapon, hands, feet
- Minimap: `o>=O.FIRE` → building color (covers FORGE=16 and future buildings)

## Wave 3 key additions (2026-06-12)
- **O additions**: STAIRS_DOWN=17, STAIRS_UP=18, CHEST=19, GRAVE=20
- **New RESOURCES**: bone
- **New EQUIP_DEF**: wooden_sword/stone_sword/iron_sword (slot:'weapon', atk field)
- **ENEMY_DEF**: gopher (hp12, atk3), stone_crab (hp25, atk7), skeleton (hp40, atk12)
- **genDungeon(seedStr, ruinIdx, floor)**: BSP rooms, corridors, STAIRS_UP/DOWN, CHESTs, enemy placement; SIZE=96 tiles, T.ROCKY floors, T.MTN walls
- **HP bar**: W.hp/maxHp=100, displayed in HUD; food/rest/well restore HP
- **weapon slot**: EQUIP_DEF[weapon].atk bonus stacks with base ATK=3; wearEquip('weapon') on hit
- **Death**: items to deathItems dict, GRAVE placed on surface, fade+exit dungeon; _dying guard prevents double-call
- **Dungeon transitions**: enterDungeon/exitDungeon/goDownstairs/goUpstairs; _transitioning flag prevents double-trigger; W._surface stores surface state; W.dungeons caches floor data
- **Save key**: changed to 'isle-pioneer-v3' (v2 saves incompatible)
- **Stairs auto-trigger**: walk onto O.STAIRS_DOWN/UP in tryMove → call goDownstairs/goUpstairs
- **contextAction priority**: current-tile GRAVE → enemy → animal → face-tile objects
- **Dungeon restrictions**: only fire+workbench buildable; growWorld skipped; ambientDark=0.88 always; player light radius shrunk; discover radius=3
