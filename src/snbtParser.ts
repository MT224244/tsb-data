import { parse, TagArray, TagMap, TagObject } from 'nbt-ts';
import { Byte, Float, Int, Short, Tag } from 'nbt-ts';

const createTag = (tag: Tag): NBTag => {
    if (tag instanceof Byte) {
        return new ByteTag(tag);
    }
    else if (tag instanceof Short) {
        return new ShortTag(tag);
    }
    else if (tag instanceof Int) {
        return new IntTag(tag);
    }
    else if (typeof tag === 'bigint') {
        return new LongTag(tag);
    }
    else if (tag instanceof Float) {
        return new FloatTag(tag);
    }
    else if (typeof tag === 'number') {
        return new DoubleTag(tag);
    }
    else if (typeof tag === 'string') {
        return new StringTag(tag);
    }
    else if (tag instanceof Array) {
        return new ListTag(tag);
    }
    else if (tag instanceof Map) {
        return new CompoundTag(tag);
    }
    else if (tag instanceof Int8Array) {
        return new ByteArrayTag(tag);
    }
    else if (tag instanceof Int32Array) {
        return new IntArrayTag(tag);
    }
    else if (tag instanceof BigInt64Array) {
        return new LongArrayTag(tag);
    }
    else if (typeof tag === 'object') {
        return new CompoundTag(tag);
    }

    throw Error('fail');
};

export const parseSnbt = <T extends NBTag = NBTag>(text: string): T => {
    try {
        return createTag(parse(text, { useMaps: true })) as T;
    }
    catch (err) {
        throw err;
    }
};

type TagType =
    | 'byte'
    // | 'boolean'
    | 'short'
    | 'int'
    | 'long'
    | 'float'
    | 'double'
    | 'string'
    | 'list'
    | 'compound'
    | 'byte_array'
    | 'int_array'
    | 'long_array';

export abstract class TagBase<T extends TagType, V> {
    public type: T;
    public value: V;
    constructor(type: T, value: V) {
        this.type = type;
        this.value = value;
    }
}

export class ByteTag extends TagBase<'byte', number> {
    constructor(tag: Byte) {
        super('byte', tag.value);
    }
}
// export class BooleanTag extends TagBase<'boolean', boolean> {
//     constructor(value: boolean) {
//         super('boolean', value);
//     }
// }
export class ShortTag extends TagBase<'short', number> {
    constructor(tag: Short) {
        super('short', tag.value);
    }
}
export class IntTag extends TagBase<'int', number> {
    constructor(tag: Int) {
        super('int', tag.value);
    }
}
export class LongTag extends TagBase<'long', bigint> {
    constructor(value: bigint) {
        super('long', value);
    }
}
export class FloatTag extends TagBase<'float', number> {
    constructor(tag: Float) {
        super('float', tag.value);
    }
}
export class DoubleTag extends TagBase<'double', number> {
    constructor(value: number) {
        super('double', value);
    }
}
export class StringTag extends TagBase<'string', string> {
    constructor(value: string) {
        super('string', value);
    }
}

export class ListTag<T extends NBTag = NBTag> extends TagBase<'list', T[]> {
    constructor(tags: TagArray) {
        super('list', tags.map(x => createTag(x) as T));
    }
}

export class CompoundTag extends TagBase<'compound', Map<string, NBTag>> {
    constructor(tag: TagObject | TagMap) {
        let tmp: Map<string, Tag>;
        if (tag instanceof Map) {
            tmp = tag;
        }
        else {
            tmp = new Map(Object.entries(tag));
        }

        const map = new Map<string, NBTag>();
        for (const [key, value] of tmp) {
            map.set(key, createTag(value));
        }

        super('compound', map);
    }

    toJSON() {
        return [...this.value]
            .reduce((prev, [key, val]) => Object.assign(prev, {
                type: this.type,
                value: { [key]: val }
            }), {});
    }
}

export class ByteArrayTag extends TagBase<'byte_array', Int8Array> {
    constructor(values: Int8Array) {
        super('byte_array', values);
    }
}
export class IntArrayTag extends TagBase<'int_array', Int32Array> {
    constructor(values: Int32Array) {
        super('int_array', values);
    }
}
export class LongArrayTag extends TagBase<'long_array', BigInt64Array> {
    constructor(values: BigInt64Array) {
        super('long_array', values);
    }
}

export type NBTag =
    | ByteTag
    // | BooleanTag
    | ShortTag
    | IntTag
    | LongTag
    | FloatTag
    | DoubleTag
    | StringTag
    | ListTag
    | CompoundTag
    | ByteArrayTag
    | IntArrayTag
    | LongArrayTag;
