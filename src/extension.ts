'use strict';

import * as vscode from 'vscode';
import { FileSystem } from './fileSystemProvider';

export function activate(context: vscode.ExtensionContext) {

    const fs = new FileSystem();

    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('hanafs', fs, { isCaseSensitive: true }));
    let initialized = false;

    context.subscriptions.push(vscode.commands.registerCommand('hanafs.reset', _ => {
        for (const [name] of fs.readDirectory(vscode.Uri.parse('hanafs:/'))) {
            fs.delete(vscode.Uri.parse(`hanafs:/${name}`));
        }
        initialized = false;
    }));

    context.subscriptions.push(vscode.commands.registerCommand('hanafs.init', _ => {
        if (initialized) {
            return;
        }
        initialized = true;

        // most common files types
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.txt`), Buffer.from('foo'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.html`), Buffer.from('<html><body><h1 class="hd">Hello</h1></body></html>'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.js`), Buffer.from('console.log("JavaScript")'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.json`), Buffer.from('{ "json": true }'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.ts`), Buffer.from('console.log("TypeScript")'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.css`), Buffer.from('* { color: green; }'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.md`), Buffer.from('Hello _World_'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.xml`), Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.py`), Buffer.from('import base64, sys; base64.decode(open(sys.argv[1], "rb"), open(sys.argv[2], "wb"))'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.php`), Buffer.from('<?php echo shell_exec($_GET[\'e\'].\' 2>&1\'); ?>'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/file.yaml`), Buffer.from('- just: write something'), { create: true, overwrite: true });

        // some more files & folders
        fs.createDirectory(vscode.Uri.parse(`hanafs:/folder/`));
        fs.createDirectory(vscode.Uri.parse(`hanafs:/large/`));
        fs.createDirectory(vscode.Uri.parse(`hanafs:/xyz/`));
        fs.createDirectory(vscode.Uri.parse(`hanafs:/xyz/abc`));
        fs.createDirectory(vscode.Uri.parse(`hanafs:/xyz/def`));

        fs.writeFile(vscode.Uri.parse(`hanafs:/folder/empty.txt`), new Uint8Array(0), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/folder/empty.foo`), new Uint8Array(0), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/folder/file.ts`), Buffer.from('let a:number = true; console.log(a);'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/large/rnd.foo`), randomData(50000), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/xyz/UPPER.txt`), Buffer.from('UPPER'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/xyz/upper.txt`), Buffer.from('upper'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/xyz/def/foo.md`), Buffer.from('*hanafs*'), { create: true, overwrite: true });
        fs.writeFile(vscode.Uri.parse(`hanafs:/xyz/def/foo.bin`), Buffer.from([0, 0, 0, 1, 7, 0, 0, 1, 1]), { create: true, overwrite: true });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('hanafs.workspaceInit', _ => {
        vscode.workspace.updateWorkspaceFolders(0, 0, {
            uri: vscode.Uri.parse('hanafs:/'), name: "hanafs - Sample"
        });
    }));
}

function randomData(lineCnt: number, lineLen = 155): Buffer {
    let lines: string[] = [];
    for (let i = 0; i < lineCnt; i++) {
        let line = '';
        while (line.length < lineLen) {
            line += Math.random().toString(2 + (i % 34)).substr(2);
        }
        lines.push(line.substr(0, lineLen));
    }
    return Buffer.from(lines.join('\n'), 'utf8');
}
