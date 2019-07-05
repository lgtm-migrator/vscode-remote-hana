'use strict';

import * as vscode from 'vscode';
import { FileSystem } from './fileSystemProvider';

export function activate(context: vscode.ExtensionContext) {


    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider('hanafs', new FileSystem(), { isCaseSensitive: true })
    );

    context.subscriptions.push(vscode.commands.registerCommand('hanafs.workspaceInit', async _ => {

        const host = await vscode.window.showInputBox({
            prompt: "Hana repository host: "
        });

        // if user input host name
        if (host) {
            vscode.workspace.updateWorkspaceFolders(0, 0, {
                uri: vscode.Uri.parse(`hanafs://${host}`), name: host
            });
        }

    }));

}
