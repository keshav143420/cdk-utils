import { readdir as _readdir } from 'fs/promises';
import _path from 'path';

import { Stack } from 'aws-cdk-lib';

import { argValidator as _argValidator } from '@vamship/arg-utils';
import Promise from 'bluebird';

import ConstructFactory from './construct-factory.js';
import DirInfo from './dir-info.js';

import IConstructProps from './construct-props.js';

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
    private _factoryModules?: Array<{
        // eslint-disable-next-line tsel/no-explicit-any
        construct: ConstructFactory<any>;
        directory: DirInfo;
    }>;

    /**
     * @param rootPath The path to the root directory that contains the
     *        construct definitions.
     */
    constructor(rootPath: string) {
        _argValidator.checkString(rootPath, 1, 'Invalid rootPath (arg #1)');

        this._rootPath = rootPath;
        this._factoryModules = undefined;
    }

    /**
     * Internal method to load a module dynamically. Made static and public for testing purposes.
     * @private
     */
    static async _loadModule(path: string) {
        const module = await import(path);
        return module.default || module;
    }

    /**
     * Recursively loads constructs from the specified directory.
     *
     * @static
     * @private
     * @param dirInfo An object representing the directory that is
     *        currently being traversed.
     */
    private static async _loadRecursive(directory: DirInfo) {
        _argValidator.checkInstance(
            directory,
            DirInfo as any, // eslint-disable-line tsel/no-explicit-any
            'Invalid directory (arg #1)',
        );

        const files = await _readdir(directory.absPath, {
            withFileTypes: true,
        });

        type ModuleEntry = {
            // eslint-disable-next-line tsel/no-explicit-any
            construct: ConstructFactory<any>;
            directory: DirInfo;
        };

        const results: ModuleEntry[] = (await Promise.map(
            files,
            async (file) => {
                const { name } = file;
                if (file.isDirectory()) {
                    return await ConstructBuilder._loadRecursive(
                        directory.createChild(name),
                    );
                } else if (file.isFile() && name.endsWith('.js')) {
                    const modulePath = _path.resolve(directory.absPath, name);
                    return [
                        {
                            construct:
                                await ConstructBuilder._loadModule(modulePath),
                            directory,
                        },
                    ];
                }
                return [];
            },
        )
            .filter((item) => !!item)
            .reduce(
                (result: ModuleEntry[], modules: ModuleEntry[]) =>
                    result.concat(modules),
                [],
            )) as ModuleEntry[];

        return results;
    }

    /**
     * Initializes and configures each of the loaded constructs using the
     * specified scope.
     *
     * @param scope The scope to which each of the constructs will be bound.
     * @param [props] An optional collection of properties that will be passed
     *        down to the init/config operations.
     */
    async build(scope: Stack, props: IConstructProps) {
        _argValidator.checkObject(scope, 'Invalid scope (arg #1)');
        props = Object.assign({}, props);

        const modules = await ConstructBuilder._loadRecursive(
            new DirInfo(this._rootPath),
        );

        this._factoryModules = modules.filter(
            // eslint-disable-next-line tsel/no-explicit-any
            ({ construct }: { construct: any; directory: DirInfo }) =>
                construct instanceof ConstructFactory,
        );

        return Promise.map(
            this._factoryModules || [],
            ({
                construct,
            }: {
                // eslint-disable-next-line tsel/no-explicit-any
                construct: ConstructFactory<any>;
                directory: DirInfo;
            }) => construct.init(scope, props),
        );
    }
}
