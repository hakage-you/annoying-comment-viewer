import { access } from 'fs';

/**
 * ファイルの存在をチェックする
 */
export function existsFile(path: string, callback: (err: any) => void) {
    if(path == null) return callback('path is nullish')
    access(path,(err)=>{
        callback(err);
    })
}
