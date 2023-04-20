import { parse } from '@deno-minecraft/nbt/snbt.ts';
import {
    ByteArrayTag,
    ByteTag,
    CompoundTag,
    DoubleTag,
    FloatTag,
    IntArrayTag,
    IntTag,
    ListTag,
    LongArrayTag,
    LongTag,
    ShortTag,
    StringTag,
    Tag,
} from '@deno-minecraft/nbt/tag.ts'
import { IO_GET_ID } from '@deno-minecraft/nbt/_tag.ts';

const tagType: Record<number, string> = {
    1: 'byte',
    2: 'short',
    3: 'int',
    4: 'long',
    5: 'float',
    6: 'double',
    7: 'byte_array',
    8: 'string',
    9: 'list',
    10: 'compound',
    11: 'int_array',
    12: 'long_array',
};

const injectToJSON = <T extends Tag>(tag: T, value?: (self: T) => unknown) => {
    Object.defineProperty(tag, 'toJSON', {
        value(this: T) {
            return {
                type: tagType[this[IO_GET_ID]()],
                value: value ? value(this) : this.valueOf(),
            };
        },
    });
};

injectToJSON(ByteTag.prototype);
injectToJSON(ShortTag.prototype);
injectToJSON(IntTag.prototype);
injectToJSON(LongTag.prototype);
injectToJSON(FloatTag.prototype);
injectToJSON(DoubleTag.prototype);
injectToJSON(ByteArrayTag.prototype, self => [...self.valueOf()]);
injectToJSON(StringTag.prototype);
injectToJSON(ListTag.prototype);
injectToJSON(CompoundTag.prototype, self => {
    return [...self.valueOf()].reduce((l, [k, v]) => {
        return Object.assign(l, { [k]: v })
    }, {});
});
injectToJSON(IntArrayTag.prototype, self => [...self.valueOf()]);
injectToJSON(LongArrayTag.prototype, self => [...self.valueOf()]);

export const parseSnbt = <T extends Tag = Tag>(text: string): T => {
    try {
        return parse(text) as T;
    }
    catch (err) {
        throw err;
    }
};
