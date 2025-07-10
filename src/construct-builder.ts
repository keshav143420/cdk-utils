import fs from 'node:fs';
import path from 'node:path';

import { Stack } from 'aws-cdk-lib';

import { argValidator } from '@vamship/arg-utils';
import { Promise } from 'bluebird'; // Bluebird might need to be replaced or handled if it causes issues with ESM/async

import ConstructFactory from './construct-factory.js';
import DirInfo from './dir-info.js';

import IConstructProps from './construct-props.js';

async function _loadModule(filePath: string): Promise<unknown> {
    const module = await import(filePath);
    return module.default || module;
}

/**
 * Class that can be used to traverse a file system, load constructs from
 * individual files, initialize and configure them.
 *
 * Constructs can be defined in individual files, but must be wrapped with a
 * ConstructFactory instance. Any file that does not export a ConstructFactory
 * instance will be ignored.
 */
export default class ConstructBuilder {
    private _rootPath: string;
    private _factoryModules?: ConstructFactory<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

    /**
     * @param rootPath The path to the root directory that contains the
     *        construct definitions.
     */
    constructor(rootPath: string) {
        argValidator.checkString(rootPath, 1, 'Invalid rootPath (arg #1)');

        this._rootPath = rootPath;
        this._factoryModules = undefined;
    }

    /**
     * Recursively loads constructs from the specified directory.
     *
     * @static
     * @private
     * @param dirInfo An object representing the directory that is
     *        currently being traversed.
     */
    private static async _loadRecursive(directory: DirInfo): Promise<any[]> {
        argValidator.checkInstance(
            directory,
            DirInfo,
            'Invalid directory (arg #1)'
        );

        const files = await fs.promises.readdir(directory.absPath, {
            withFileTypes: true,
        });

        const loadPromises = files.map(async (file) => {
            const { name } = file;
            if (file.isDirectory()) {
                return ConstructBuilder._loadRecursive(
                    directory.createChild(name)
                );
            } else if (file.isFile() && (name.endsWith('.js') || name.endsWith('.mjs'))) { // Added .mjs
                const modulePath = path.resolve(directory.absPath, name);
                // The dynamic import path must be a relative or absolute path string.
                // For Windows, ensure backslashes are converted to forward slashes for URL compatibility if needed,
                // though `pathToFileURL` is more robust.
                const moduleURL = path.pathToFileURL(modulePath).href;
                return {
                    construct: await _loadModule(moduleURL),
                    directory,
                };
            }
            return null; // Ensure all paths return a value for Promise.all
        });

        // Wait for all load promises to resolve
        const resultsWithNulls = await Promise.all(loadPromises);

        // Flatten and filter out nulls
        return resultsWithNulls.flat().filter((item) => !!item);
    }

    /**
     * Initializes and configures each of the loaded constructs using the
     * specified scope.
     *
     * @param scope The scope to which each of the constructs will be bound.
     * @param [props] An optional collection of properties that will be passed
     *        down to the init/config operations.
     */
    async build(scope: Stack, props: IConstructProps): Promise<void> {
        argValidator.checkObject(scope, 'Invalid scope (arg #1)');
        props = Object.assign({}, props);

        const modules = await ConstructBuilder._loadRecursive(
            new DirInfo(this._rootPath)
        );

        this._factoryModules = modules.filter(
            ({ construct }) => construct instanceof ConstructFactory
        );

        const initPromises = this._factoryModules.map(({ construct }) =>
            construct.init(scope, props)
        );
        await Promise.all(initPromises);
    }
}
