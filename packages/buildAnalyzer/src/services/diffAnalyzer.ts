import { FileInfo } from '../types';

export class DiffAnalyzer {
    analyze(current: FileInfo[], last: FileInfo[]) {
        const currentMap = new Map(current.map(c => [c.filepath, c]));
        const lastMap = new Map(last.map(l => [l.filepath, l]));

        const add = current.filter(c => !lastMap.has(c.filepath));
        const update = current.filter(c => {
            const lastFile = lastMap.get(c.filepath);
            return lastFile && lastFile.hash !== c.hash;
        });
        const remove = last.filter(l => !currentMap.has(l.filepath));

        return { add, update, remove };
    }
}