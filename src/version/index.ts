import { sort } from 'semver';

const [tsbTagsUrl, selfTagsUrl] = Deno.args;

type Tag = {
    name: string;
};

const fetchVersions = async (repo: string) => {
    const url = `https://api.github.com/repos/${repo}/tags`;
    const res = await fetch(url);
    const json: Tag[] = await res.json();

    return json.map(x => x.name);
};

const [tsb, self] = await Promise.all([
    fetchVersions(tsbTagsUrl),
    fetchVersions(selfTagsUrl),
]);

const result = tsb.filter(x => !self.includes(x));

console.log(sort(result)[0] ?? 'master');
