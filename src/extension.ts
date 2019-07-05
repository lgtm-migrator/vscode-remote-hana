'use strict';

import * as vscode from 'vscode';
import { FileSystem } from './fileSystemProvider';

import { URL } from "url";

export function activate(context: vscode.ExtensionContext) {

    const fs = new FileSystem()

    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider('hanafs', fs, { isCaseSensitive: true })
    );

    context.subscriptions.push(vscode.commands.registerCommand('hanafs.workspaceInit', async _ => {

        const uri = await vscode.window.showInputBox({
            prompt: "Connection URI: "
        });


        // if user input host name
        if (uri) {

            const { hostname } = new URL(uri)

            vscode.workspace.updateWorkspaceFolders(0, 0, {
                uri: vscode.Uri.parse(uri), name: hostname
            });
        }

    }));

}
