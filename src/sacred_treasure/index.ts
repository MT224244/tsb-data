import { TextWriter, HttpReader, ZipReader } from 'zipjs';
import { cmp, valid } from 'semver';
import { ByteTag, CompoundTag, IntTag, ListTag, parseSnbt, StringTag } from '../snbtParser.ts';
import { AttackType, ElementType, God, IsRangeAttack, SacredTreasure, SlotId, TriggerId } from './sacred_treasure.d.ts';

const [repo, version] = Deno.args;
console.log('Target Repository:', repo);
console.log('Target Version:', version);

const githubZipUrl = `https://api.github.com/repos/${repo}/zipball/${version}`;

const zip = new ZipReader(new HttpReader(githubZipUrl));
const entries = await zip.getEntries();

const giveRegex = /\/Asset\/data\/asset\/functions\/sacred_treasure\/([^/]*)\/give\/2.give.mcfunction$/;
const stEntries = [...entries.filter(x => giveRegex.test(x.filename))];
const result = await Promise.all(stEntries.map(async entry => {
    const lines = (await entry
        .getData(new TextWriter()))
        .split('\n')
        .filter(x => x !== '' && !x.trim().startsWith('#'));

    const fix = (rawJson: string) => {
        if (!valid(version)) return rawJson;

        const below_v0_1_6: Record<string, string> = {
            '{"text":"魔法耐性+2.5% 魔法攻撃+2.5%","color":"dark_purple"}]': '[{"text":"魔法耐性+2.5% 魔法攻撃+2.5%","color":"dark_purple"}]',
            '{"text":"魔法耐性+5% 魔法攻撃+5%","color":"dark_purple"}]': '[{"text":"魔法耐性+5% 魔法攻撃+5%","color":"dark_purple"}]',
            '{"text":頭上に敵Mobが来たとき。"}': '{"text":"頭上に敵Mobが来たとき。"}',
            '{"text":"僅かに残ったジャック・オ・ランタンの魂","color":"#D900FF"}]': '[{"text":"僅かに残ったジャック・オ・ランタンの魂","color":"#D900FF"}]',
        };

        let result = rawJson;
        if (cmp(version, '<=', 'v0.1.6')) {
            for (const key of Object.keys(below_v0_1_6)) {
                if (result === key) result = below_v0_1_6[key];
            }
        }

        return result;
    };

    const stData: SacredTreasure = Object.create(null);
    for (const line of lines) {
        const match = /data modify storage asset:sacred_treasure ([^ ]*) set value (.*)$/.exec(line);
        if (!match || match.length < 3) continue;

        const funcs: Record<string, (value: string) => void> = {
            'ID': value => {
                stData.id = parseSnbt<IntTag>(value).value;
            },
            'Item': value => {
                stData.item = parseSnbt<StringTag>(value).value;
            },
            'Name': value => {
                const json = parseSnbt<StringTag>(value).value;
                stData.name = JSON.parse(json);
            },
            'Lore': value => {
                const arr = parseSnbt<ListTag<StringTag>>(value).value;
                stData.lore = arr.map(x => {
                    try {
                        return JSON.parse(fix(x.value));
                    }
                    catch (err) {
                        console.error('err:', x.value);
                        return err.message;
                    }
                });
            },
            'CostText': value => {
                const json = parseSnbt<StringTag>(value).value;
                try {
                    stData.costText = JSON.parse(fix(json));
                }
                catch (err) {
                    console.log('err:', json);
                    stData.costText = err.message;
                }
            },
            'RemainingCount': value => {
                stData.remainingCount = parseSnbt<IntTag>(value).value;
            },
            'Slot': value => {
                stData.slot = parseSnbt<StringTag>(value).value as SlotId;
            },
            'Trigger': value => {
                stData.trigger = parseSnbt<StringTag>(value).value as TriggerId;
            },
            'Condition': value => {
                const json = parseSnbt<StringTag>(value).value;
                try {
                    stData.condition = JSON.parse(fix(json));
                }
                catch (err) {
                    console.log('err:', json);
                    stData.condition = err.message;
                }
            },
            'AttackInfo': value => {
                stData.attackInfo = {};

                const tag = parseSnbt<CompoundTag>(value);
                const damage = tag.value.get('Damage');
                const attackType = tag.value.get('AttackType');
                const elementType = tag.value.get('ElementType');
                const bypassResist = tag.value.get('BypassResist');
                const isRangeAttack = tag.value.get('IsRangeAttack');
                const attackRange = tag.value.get('AttackRange');

                if (damage) {
                    if (damage instanceof ListTag) {
                        stData.attackInfo.damage = damage.value.map(x => x.value);
                    }
                    else {
                        stData.attackInfo.damage = damage.value;
                    }
                }
                if (attackType) {
                    const list = attackType.value as StringTag[];
                    stData.attackInfo.attackType = list.map(x => x.value as AttackType);
                }
                if (elementType) {
                    const list = elementType.value as StringTag[];
                    stData.attackInfo.elementType = list.map(x => x.value as ElementType);
                }
                if (bypassResist) {
                    if (bypassResist instanceof StringTag) {
                        stData.attackInfo.bypassResist = Boolean(bypassResist.value);
                    }
                    else {
                        stData.attackInfo.bypassResist = bypassResist.value === 1;
                    }
                }
                if (isRangeAttack) {
                    stData.attackInfo.isRangeAttack = isRangeAttack.value as IsRangeAttack;
                }
                if (attackRange) {
                    stData.attackInfo.attackRange = attackRange.value;
                }
            },
            'AttackInfo.Damage': value => {
                if (!stData.attackInfo) stData.attackInfo = {};

                const tag = parseSnbt(value);
                if (tag instanceof ListTag) {
                    stData.attackInfo.damage = tag.value.map(x => x.value);
                }
                else {
                    stData.attackInfo.damage = tag.value;
                }
            },
            'AttackInfo.AttackType': value => {
                if (!stData.attackInfo) stData.attackInfo = {};

                const list = parseSnbt<ListTag<StringTag>>(value).value;
                stData.attackInfo.attackType = list.map(x => x.value as AttackType);
            },
            'AttackInfo.ElementType': value => {
                if (!stData.attackInfo) stData.attackInfo = {};

                const list = parseSnbt<ListTag<StringTag>>(value).value;
                stData.attackInfo.elementType = list.map(x => x.value as ElementType);
            },
            'AttackInfo.BypassResist': value => {
                if (!stData.attackInfo) stData.attackInfo = {};

                const tag = parseSnbt<ByteTag | StringTag>(value);
                if (tag instanceof StringTag) {
                    stData.attackInfo.bypassResist = Boolean(tag.value);
                }
                else {
                    stData.attackInfo.bypassResist = tag.value === 1;
                }
            },
            'AttackInfo.IsRangeAttack': value => {
                if (!stData.attackInfo) stData.attackInfo = {};

                stData.attackInfo.isRangeAttack = parseSnbt<StringTag>(value).value as IsRangeAttack;
            },
            'AttackInfo.AttackRange': value => {
                if (!stData.attackInfo) stData.attackInfo = {};

                stData.attackInfo.attackRange = parseSnbt(value).value;
            },
            'MPCost': value => {
                stData.mpCost = parseSnbt<IntTag>(value).value;
            },
            'MPRequire': value => {
                stData.mpRequire = parseSnbt<IntTag>(value).value;
            },
            'LocalCooldown': value => {
                stData.localCooldown = parseSnbt<IntTag>(value).value;
            },
            'SpecialCooldown': value => {
                stData.specialCooldown = parseSnbt<IntTag>(value).value;
            },
            'DisableCooldownMessage': value => {
                const tag = parseSnbt<ByteTag | StringTag>(value);
                if (tag instanceof StringTag) {
                    stData.disableCooldownMessage = Boolean(tag.value);
                }
                else {
                    stData.disableCooldownMessage = tag.value === 1;
                }
            },
            'CanUsedGod': value => {
                const tag = parseSnbt<ListTag<StringTag> | StringTag>(value);
                if (tag instanceof StringTag) {
                    stData.canUsedGod = tag.value as 'ALL';
                }
                else {
                    stData.canUsedGod = tag.value.map(x => x.value as God);
                }
            },
            'CustomNBT': value => {
                stData.customNbt = parseSnbt<CompoundTag>(value);
            },
        };

        const [, key, value] = match;
        if (key in funcs) funcs[key](value);
    }

    return stData;
}));

Deno.writeFileSync(
    'sacred_treasure.json',
    new TextEncoder().encode(
        JSON.stringify(result, undefined, 4)
    )
);
