
import * as path from 'path';
import * as vscode from 'vscode';
import { Buffer } from "buffer";

import { URL } from "url";
import { DirectoryInformation, FileMetadata } from './types';

const fetch: typeof import("node-fetch").default = require('fetch-cookie')(require('node-fetch'));

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    data?: Uint8Array;

    constructor(name: string) {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }
}

export class Directory implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    entries: Map<string, File | Directory>;

    constructor(name: string) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}

export type Entry = File | Directory;

interface Credential {
    username: string;
    password: string;
    _csrfToken?: string;
}

interface Credentials {
    [host: string]: Credential;
}

export class FileSystem implements vscode.FileSystemProvider {

    root = new Directory('');

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
        uri: vscode.Uri,
        content: Uint8Array,
        options: { create: boolean, overwrite: boolean }
    ): Promise<void> {
        let basename = path.posix.basename(uri.path);
        let parent = this._lookupParentDirectory(uri);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    }

    // --- manage files/folders

    async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {


    }

    async delete(uri: vscode.Uri): Promise<void> {

    }

    async createDirectory(uri: vscode.Uri): Promise<void> {

    }

    private credentials: Credentials = {};

    private async _findCredential(hostname: string): Promise<Credential> {
        if (this.credentials[hostname]) {
            return this.credentials[hostname];
        } else {
            const user = await vscode.window.showInputBox({ prompt: `Username for ${hostname}: ` });
            const password = await vscode.window.showInputBox({ prompt: `Password for ${hostname}: ` });

            if (user && password) {
                const credential: Credential = { username: user, password: password };
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
            // if require csrf token
            const body = await response.text();
            throw vscode.FileSystemError.NoPermissions(body);
        } else {
            // do nothing
        }
    }

    private async _getCsrfToken(hostname: string, force: boolean = false) {

        const credential = await this._findCredential(hostname);

        if (force || !credential._csrfToken || credential._csrfToken === "unsafe") {

            const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file`,
                { headers: { "x-csrf-token": "fetch" } }
            );

            this._processError(response);

            credential._csrfToken = response.headers.get("x-csrf-token") || "";

        }

        return credential._csrfToken;

    }

    private async _getHeaders(hostname: string) {
        const credential = await this._findCredential(hostname);
        const csrfToken = await this._getCsrfToken(hostname);

        return {
            "Authorization": `Baisc ${Buffer.from(`${credential.username}:${credential.password}`).toString("base64")}`,
            "x-csrf-token": csrfToken
        };
    }

    private _parseUri(uri: vscode.Uri): { hostname: string, pathname: string } {
        return new URL(uri.toString());
    }

    private async _readStat(uri: vscode.Uri): Promise<vscode.FileStat> {
        const { hostname, pathname } = this._parseUri(uri);

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${pathname}?parts=meta`, {
            headers: await this._getHeaders(hostname)
        });

        this._processError(response);

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
            headers: await this._getHeaders(hostname)
        });

        this._processError(response);

        const body = await response.text();

        return new TextEncoder().encode(body);

    }

    private async _readDirectory(uri: vscode.Uri): Promise<DirectoryInformation> {

        const { hostname, pathname } = this._parseUri(uri);

        const response = await fetch(`https://${hostname}/sap/hana/xs/dt/base/file/${pathname}?depth=1`, {
            headers: await this._getHeaders(hostname)
        });

        this._processError(response);

        const body: DirectoryInformation = await response.json();

        return body;

    }

    // --- lookup

    private _lookup(uri: vscode.Uri, silent: false): Entry;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined {
        let parts = uri.path.split('/');
        let entry: Entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: Entry | undefined;
            if (entry instanceof Directory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                } else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }

    private _lookupAsDirectory(uri: vscode.Uri, silent: boolean): Directory {
        let entry = this._lookup(uri, silent);
        if (entry instanceof Directory) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }

    private _lookupAsFile(uri: vscode.Uri, silent: boolean): File {
        let entry = this._lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    private _lookupParentDirectory(uri: vscode.Uri): Directory {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    // --- manage file events

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}
