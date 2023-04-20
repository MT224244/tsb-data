import { TextWriter, HttpReader, ZipReader } from 'zipjs';
import { cmp, valid } from 'semver';
import { ByteTag, CompoundTag, IntTag, ListTag, StringTag, Tag } from '@deno-minecraft/nbt/tag.ts';
import { parseSnbt } from '../snbtParser.ts';
import { AttackType, ElementType, God, IsRangeAttack, SacredTreasure, SlotId, TriggerId } from './artifact.d.ts';
import { sectionToTextComponent } from '../sectionToTextComponent.ts';

const [repo, version] = Deno.args;
console.log('Target Repository:', repo);
console.log('Target Version:', version);

const githubZipUrl = `https://api.github.com/repos/${repo}/zipball/${version}`;

const zip = new ZipReader(new HttpReader(githubZipUrl));
const entries = await zip.getEntries();

const giveRegex = /\/Asset\/data\/asset\/functions\/(?:sacred_treasure|artifact)\/([^/]*)\/give\/2.give.mcfunction$/;
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
        const match = /data modify storage asset:(?:sacred_treasure|artifact) ([^ ]*) set value (.*)$/.exec(line);
        if (!match || match.length < 3) continue;

        const attackInfoDamage = (tag: Tag) => {
            if (!stData.attackInfo) stData.attackInfo = {};

            if (tag instanceof ListTag) {
                stData.attackInfo.damage = tag.valueOf().map((x: Tag) =>
                    sectionToTextComponent(`${x.valueOf()}`),
                );
            }
            else {
                stData.attackInfo.damage = [sectionToTextComponent(`${tag.valueOf()}`)];
            }
        };
        const attackInfoAttackType = (tag: Tag) => {
            if (!stData.attackInfo) stData.attackInfo = {};

            const list = tag.valueOf() as StringTag[];
            stData.attackInfo.attackType = list.map(x => x.valueOf() as AttackType);
        };
        const attackInfoElementType = (tag: Tag) => {
            if (!stData.attackInfo) stData.attackInfo = {};

            const list = tag.valueOf() as StringTag[];
            stData.attackInfo.elementType = list.map(x => x.valueOf() as ElementType);
        };
        const attackInfoBypassResist = (tag: Tag) => {
            if (!stData.attackInfo) stData.attackInfo = {};

            if (tag instanceof StringTag) {
                stData.attackInfo.bypassResist = Boolean(tag.valueOf());
            }
            else {
                stData.attackInfo.bypassResist = tag.valueOf() === 1;
            }
        };
        const attackInfoIsRangeAttack = (tag: Tag) => {
            if (!stData.attackInfo) stData.attackInfo = {};

            stData.attackInfo.isRangeAttack = tag.valueOf() as IsRangeAttack;
        };
        const attackInfoAttackRange = (tag: Tag) => {
            if (!stData.attackInfo) stData.attackInfo = {};

            stData.attackInfo.attackRange = sectionToTextComponent(`${tag.valueOf()}`);
        };

        const funcs: Record<string, (value: string) => void> = {
            'ID': value => {
                stData.id = parseSnbt<IntTag>(value).valueOf();
            },
            'Item': value => {
                stData.item = parseSnbt<StringTag>(value).valueOf();
            },
            'Name': value => {
                const json = parseSnbt<StringTag>(value).valueOf();
                stData.name = sectionToTextComponent(JSON.parse(json));
            },
            'Lore': value => {
                const arr = parseSnbt<ListTag<StringTag>>(value).valueOf();
                stData.lore = arr.map(x => {
                    try {
                        const c = JSON.parse(fix(x.valueOf()));
                        if (c instanceof Array) {
                            return c.map(x => sectionToTextComponent(x));
                        }
                        return sectionToTextComponent(c);
                    }
                    catch (err) {
                        console.error('err:', x.valueOf());
                        return err.message;
                    }
                });
            },
            'CostText': value => {
                const json = parseSnbt<StringTag>(value).valueOf();
                try {
                    stData.costText = JSON.parse(fix(json));
                }
                catch (err) {
                    console.log('err:', json);
                    stData.costText = err.message;
                }
            },
            'RemainingCount': value => {
                stData.remainingCount = parseSnbt<IntTag>(value).valueOf();
            },
            'Slot': value => {
                stData.slot = parseSnbt<StringTag>(value).valueOf() as SlotId;
            },
            'Trigger': value => {
                stData.trigger = parseSnbt<StringTag>(value).valueOf() as TriggerId;
            },
            'Condition': value => {
                const json = parseSnbt<StringTag>(value).valueOf();
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
                const damage = tag.valueOf().get('Damage');
                const attackType = tag.valueOf().get('AttackType');
                const elementType = tag.valueOf().get('ElementType');
                const bypassResist = tag.valueOf().get('BypassResist');
                const isRangeAttack = tag.valueOf().get('IsRangeAttack');
                const attackRange = tag.valueOf().get('AttackRange');

                if (damage) attackInfoDamage(damage);
                if (attackType) attackInfoAttackType(attackType);
                if (elementType) attackInfoElementType(elementType);
                if (bypassResist) attackInfoBypassResist(bypassResist);
                if (isRangeAttack) attackInfoIsRangeAttack(isRangeAttack);
                if (attackRange) attackInfoAttackRange(attackRange);
            },
            'AttackInfo.Damage': value => attackInfoDamage(parseSnbt(value)),
            'AttackInfo.AttackType': value => attackInfoAttackType(parseSnbt(value)),
            'AttackInfo.ElementType': value => attackInfoElementType(parseSnbt(value)),
            'AttackInfo.BypassResist': value => attackInfoBypassResist(parseSnbt(value)),
            'AttackInfo.IsRangeAttack': value => attackInfoIsRangeAttack(parseSnbt(value)),
            'AttackInfo.AttackRange': value => attackInfoAttackRange(parseSnbt(value)),
            'MPCost': value => {
                stData.mpCost = parseSnbt<IntTag>(value).valueOf();
            },
            'MPRequire': value => {
                stData.mpRequire = parseSnbt<IntTag>(value).valueOf();
            },
            'LocalCooldown': value => {
                stData.localCooldown = parseSnbt<IntTag>(value).valueOf();
            },
            'SpecialCooldown': value => {
                stData.specialCooldown = parseSnbt<IntTag>(value).valueOf();
            },
            'DisableCooldownMessage': value => {
                const tag = parseSnbt<ByteTag>(value);
                stData.disableCooldownMessage = tag.valueOf() === 1;
            },
            'CanUsedGod': value => {
                const tag = parseSnbt<ListTag<StringTag> | StringTag>(value);
                if (tag instanceof StringTag) {
                    stData.canUsedGod = tag.valueOf() as 'ALL';
                }
                else {
                    stData.canUsedGod = tag.valueOf().map(x => x.valueOf() as God);
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
    'artifacts.json',
    new TextEncoder().encode(
        JSON.stringify(
            result,
            (_, v) => typeof v === 'bigint' ? v.toString() + 'n' : v,
            4,
        ),
    ),
);

Deno.exit();
