import path from 'node:path';
import { argValidator } from '@vamship/arg-utils';

/**
 * Class that represents a directory in a construct hierarchy. Exposes methods
 * and properties that allow directory/path information to be used to initialize
 * and/or configure the construct.
 */
export default class DirInfo {
    private _name: string;
    private _path: string;
    private _absPath: string;
    private _parentPath: string;
    private _absPathTokens: string[];

    /**
     * @param path The path to the directory.
     */
    constructor(filePath: string) { // Renamed path to filePath to avoid conflict with 'path' module
        argValidator.checkString(filePath, 1, 'Invalid filePath (arg #1)');

        const parsedPath = path.parse(path.normalize(filePath));
        this._name = parsedPath.base;
        this._path = path.join(parsedPath.dir, parsedPath.base);
        this._absPath = path.resolve(filePath);
        this._parentPath = path.resolve(parsedPath.dir);

        this._absPathTokens = this._absPath.split(path.sep);
    }

    /**
     * Gets the name of the current directory, not including any parent paths.
     *
     * @return The name of the current directory.
     */
    public get name(): string {
        return this._name;
    }

    /**
     * Gets the normalized path of the current directory. This path may be
     * relative or absolute depending on how the object was initialized.
     *
     * @return The normalized path.
     */
    public get path(): string {
        return this._path;
    }

    /**
     * Gets the absolute path to the current directory.
     *
     * @return The absolute directory path.
     */
    public get absPath(): string {
        return this._absPath;
    }

    /**
     * Gets the absolute normalized path of the parent directory.
     *
     * @return The normalized path.
     */
    public get parentPath(): string {
        return this._parentPath;
    }

    /**
     * Gets the path to an API route, formulating the path from the specified
     * base directory.
     *
     * @param basePath The base path from which to calculate the
     *        api route path. This path should separate tokens using a forward
     *        slash (/)
     *
     * @return The calculated relative path.
     */
    public getApiRoutePath(basePath: string): string {
        argValidator.checkString(basePath, 1, 'Invalid basePath (arg #1)');

        const basePathTokens = path.resolve(basePath).split(path.sep);

        if (basePathTokens.length > this._absPathTokens.length) {
            throw new Error('Base has more levels than the directory path');
        }

        basePathTokens.forEach((token, index) => {
            if (token !== this._absPathTokens[index]) {
                throw new Error('Base path does not exist in directory path');
            }
        });

        const startIndex = basePathTokens.length;

        return [''].concat(this._absPathTokens.slice(startIndex)).join('/');
    }

    /**
     * Creates a child directory for the current directory.
     *
     * @param name The name of the child directory
     *
     * @return {Object} An object that represents the child directory.
     */
    public createChild(name: string): DirInfo {
        argValidator.checkString(name, 1, 'Invalid name (arg #1)');

        return new DirInfo(path.join(this.path, name));
    }
}
