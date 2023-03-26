import { TextComponent } from './sacred_treasure/sacred_treasure.d.ts';

export const sectionToTextComponent = (textOrComponent: string | TextComponent | TextComponent[]): TextComponent | TextComponent[] => {
    if (textOrComponent instanceof Array) {
        return textOrComponent.map(x => {
            return sectionToTextComponent(x);
        }).flat();
    }

    if (typeof textOrComponent !== 'string' && !textOrComponent.text?.includes('§')) {
        return textOrComponent;
    }

    const result: TextComponent[] = [];

    const chars = typeof textOrComponent === 'string'
        ? [...textOrComponent]
        : [...textOrComponent.text ?? ''];

    let component: TextComponent = {};
    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === '§') {
            if (component.text) {
                result.push({...component});
                component = {};
            }

            const section = `${chars[i]}${chars[++i]}`;
            if (section === '§0') component.color = 'black';
            else if (section === '§1') component.color = 'dark_blue';
            else if (section === '§2') component.color = 'dark_green';
            else if (section === '§3') component.color = 'dark_aqua';
            else if (section === '§4') component.color = 'dark_red';
            else if (section === '§5') component.color = 'dark_purple';
            else if (section === '§6') component.color = 'gold';
            else if (section === '§7') component.color = 'gray';
            else if (section === '§8') component.color = 'dark_gray';
            else if (section === '§9') component.color = 'blue';
            else if (section === '§a') component.color = 'green';
            else if (section === '§b') component.color = 'aqua';
            else if (section === '§c') component.color = 'red';
            else if (section === '§d') component.color = 'light_purple';
            else if (section === '§e') component.color = 'yellow';
            else if (section === '§f') component.color = 'white';
            else if (section === '§k') component.obfuscated = true;
            else if (section === '§l') component.bold = true;
            else if (section === '§m') component.strikethrough = true;
            else if (section === '§n') component.underlined = true;
            else if (section === '§o') component.italic = true;
            else if (section === '§r') {
                component.color = 'white';
                component.obfuscated = false;
                component.bold = false;
                component.strikethrough = false;
                component.underlined = false;
                component.italic = false;
            }

            continue;
        }

        if (!component.text) component.text = '';
        component.text += chars[i];
    }
    result.push(component);

    return result.length === 1
        ? result[0]
        : result;
};
