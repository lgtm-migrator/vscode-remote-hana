
import * as path from 'path';
import * as vscode from 'vscode';
import { Buffer } from "buffer";

import { URL } from "url";
import { DirectoryInformation, FileMetadata } from './types';

const fetch: typeof import("node-fetch").default = require('fetch-cookie')(require('node-fetch'));

interface Credential {
    username: string;
    password: string;
    _csrfToken?: string;
}

interface Credentials {
    [host: string]: Credential;
}

export class FileSystem implements vscode.FileSystemProvider {


    // --- manage file metadata

    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return await this._readStat(uri);
    }

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const entry = await this._readDirectory(uri);
        let result: [string, vscode.FileType][] = [];
        for (const child of entry.Children) {
            result.push([child.Name, child.Directory ? vscode.FileType.Directory : vscode.FileType.File]);
        }
        return result;
    }

    // --- manage file contents

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return await this._readFileContent(uri);
    }

    async writeFile(
        uri: vscode.Uri, content: Uint8Array,
        options: { create: boolean, overwrite: boolean }
    ): Promise<void> {

        const { hostname, pathname } = this._parseUri(uri);

        let headers: any = await this._getHeaders(uri);

        let body: any;

        const fileName = path.basename(pathname);

        switch (path.extname(fileName)) {
            case ".js":
            case ".xsjs":
            case ".css":
            case ".html":
            case "": // start with .
                headers["content-type"] = "text/javascriptcharset=UTF-8";
                body = Buffer.from(content).toString("UTF-8");
                break;
            default:


                break;
        }

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${pathname}`, {
            method: "PUT", // for put method, if file not exist, hana will create it.
            headers: headers,
            body: body
        });

        await this._processError(response);

    }

    // --- manage files/folders

    // rename or move
    async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
        const { hostname, pathname } = this._parseUri(oldUri);

        const headers: any = await this._getHeaders(oldUri);
        const oldBasePath = path.dirname(pathname);
        const newPath = await this._parseUri(newUri).pathname;
        const newFilename = path.basename(newPath);

        // if path not equal, need workaround to move file

        headers["Content-Type"] = "application/json;charset=UTF-8";

        headers["X-Create-Options"] = "move,no-overwrite";

        const payload = {
            Location: `/sap/hana/xs/dt/base/file${pathname}`,
            Target: newFilename
        };

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file${oldBasePath}/`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        await this._processError(response);

    }

    async delete(uri: vscode.Uri): Promise<void> {
        const { hostname, pathname } = this._parseUri(uri);

        let headers: any = await this._getHeaders(uri);

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${pathname}`, {
            method: "DELETE",
            headers,
        });

        await this._processError(response);
    }

    async createDirectory(uri: vscode.Uri): Promise<void> {


        const { hostname, pathname } = this._parseUri(uri);
        const base = path.dirname(pathname);
        const directoryName = path.basename(pathname);

        const payload = {
            Name: directoryName,
            Directory: true
        };

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${base}`, {
            method: "POST",
            headers: await this._getHeaders(uri),
            body: JSON.stringify(payload)
        });

        await this._processError(response);

    }

    private credentials: Credentials = {};

    private async _findCredential(uri: vscode.Uri): Promise<Credential> {
        const { hostname, username, password } = this._parseUri(uri);

        if (this.credentials[hostname]) {
            return this.credentials[hostname];
        } else {

            if (username && password) {
                const credential: Credential = { username: username, password: password };
                this.credentials[hostname] = credential;
                return credential;
            } else {
                throw vscode.FileSystemError.Unavailable("You must provide credential");
            }
        }

    }

    /**
     * throw error if response body not correctly
     */
    private async _processError(response: import("node-fetch").Response) {
        if (response.status >= 500) {

            const body = await response.text();
            throw vscode.FileSystemError.Unavailable(body);
        } else if (response.status >= 400) {

            switch (response.status) {
                case 404:
                    throw vscode.FileSystemError.FileNotFound();
                default:
                    // if require csrf token
                    const body = await response.text();
                    throw vscode.FileSystemError.NoPermissions(body);
            }

        } else {
            // do nothing
        }
    }

    private async _getCsrfToken(uri: vscode.Uri, force: boolean = false) {

        const { hostname } = this._parseUri(uri);

        const credential = await this._findCredential(uri);

        if (force || !credential._csrfToken || credential._csrfToken === "unsafe") {

            const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file`,
                { headers: { "x-csrf-token": "fetch" } }
            );

            await this._processError(response);

            credential._csrfToken = response.headers.get("x-csrf-token") || "";

        }

        return credential._csrfToken;

    }

    private async _getHeaders(uri: vscode.Uri) {
        const credential = await this._findCredential(uri);
        const csrfToken = await this._getCsrfToken(uri);

        return {
            "Authorization": `Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString("base64")}`,
            "x-csrf-token": csrfToken
        };
    }

    private _parseUri(uri: vscode.Uri): URL {
        return new URL(uri.toString());
    }

    private async _readStat(uri: vscode.Uri): Promise<vscode.FileStat> {
        const { hostname, pathname } = this._parseUri(uri);

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${pathname}?parts=meta`, {
            headers: await this._getHeaders(uri)
        });


        await this._processError(response);

        const body: DirectoryInformation | FileMetadata = await response.json();

        const fileType = body.Directory ? vscode.FileType.Directory : vscode.FileType.File;

        return {
            type: fileType,
            size: 0,
            mtime: 0,
            ctime: 0,
        };


    }


    private async _readFileContent(uri: vscode.Uri): Promise<Uint8Array> {

        const { hostname, pathname } = this._parseUri(uri);

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${pathname}?depth=1`, {
            headers: await this._getHeaders(uri)
        });

        await this._processError(response);

        const body = await response.buffer();

        return body;
    }

    private async _readDirectory(uri: vscode.Uri): Promise<DirectoryInformation> {

        const { hostname, pathname } = this._parseUri(uri);

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${pathname}?depth=1`, {
            headers: await this._getHeaders(uri)
        });

        await this._processError(response);

        const body: DirectoryInformation = await response.json();

        return body;

    }


    // --- manage file events

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }


}
