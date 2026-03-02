/* eslint-disable tsel/no-unused-expressions */
/* eslint-disable tsel/no-unused-vars */
/* eslint-disable tsel/no-explicit-any */
import 'mocha';
import { expect, use as _useWithChai } from 'chai';
import _sinon from 'sinon';
import _sinonChai from 'sinon-chai';
import _chaiAsPromised from 'chai-as-promised';

_useWithChai(_sinonChai);
_useWithChai(_chaiAsPromised);

import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import {
    asyncHelper as _asyncHelper,
    testValues as _testValues,
} from '@vamship/test-utils';
import Promise from 'bluebird';
import _path from 'path';
import _esmock from 'esmock';

import DirInfo from '../../src/dir-info.js';
import ConstructFactory from '../../src/construct-factory.js';
import IConstructProps from '../../src/construct-props.js';

describe('ConstructBuilder', () => {
    class MockConstructFactory extends ConstructFactory<Construct> {
        protected async _init(scope: Stack, props: IConstructProps) {
            return {} as Construct;
        }
    }

    let ConstructBuilder: any;
    let _readdirStub: any;
    let _loadModuleStub: any;
    let _readdirData: any[];
    let _readdirCallIndex: number;

    async function _import() {
        _readdirCallIndex = 0;
        _readdirData = [[]];

        _readdirStub = _sinon.stub().callsFake(() => {
            const data = _readdirData[_readdirCallIndex];
            _readdirCallIndex++;
            return Promise.resolve(data);
        });

        _loadModuleStub = _sinon.stub().resolves({});

        const ConstructBuilderModule = await _esmock(
            '../../src/construct-builder.js',
            {
                'fs/promises': { readdir: _readdirStub },
            },
        );

        ConstructBuilder = ConstructBuilderModule.default;

        // Stub the static _loadModule method
        _sinon.stub(ConstructBuilder, '_loadModule').callsFake(_loadModuleStub);
    }

    function _createInstance(rootPath = _testValues.getString('rootPath')) {
        return new ConstructBuilder(rootPath);
    }

    function _createFactoryModules(count: number): Array<{
        construct: MockConstructFactory;
        directory: DirInfo;
    }> {
        return new Array(count)
            .fill(0)
            .map((item, index) => new MockConstructFactory(`factory-${index}`))
            .map((construct) => ({
                construct,
                directory: new DirInfo(_testValues.getString('name')),
            }));
    }

    beforeEach(async () => {
        await _import();
    });

    afterEach(() => {
        _esmock.purge(ConstructBuilder);
        _sinon.restore();
    });

    describe('[static]', () => {
        interface IDirData {
            name: string;
            isDirectory: () => boolean;
            isFile: () => boolean;
        }

        function _createDirInfo(
            name = _testValues.getString('name'),
            path = _testValues.getString('path'),
        ): DirInfo {
            return new DirInfo(name);
        }

        function _createDirList(dirs: string[], files: string[]): IDirData[] {
            const dirList: IDirData[] = [];

            dirs = dirs || [];
            files = files || [];

            dirs.reduce((result, item, index) => {
                result.push({
                    name: item,
                    isDirectory: () => true,
                    isFile: () => false,
                });
                return dirList;
            }, dirList);

            files.reduce((result, item, index) => {
                result.push({
                    name: item,
                    isDirectory: () => false,
                    isFile: () => true,
                });
                return dirList;
            }, dirList);

            return dirList;
        }

        function _buildFileList(
            callback:
                | string
                | ((item: string, index: number) => string)
                | undefined,
            count = 3,
        ): string[] {
            if (typeof callback === 'string') {
                const extension = callback;
                callback = (item, index): string =>
                    `item-${index}.${extension}`;
            } else if (typeof callback !== 'function') {
                callback = (item, index): string => `item-${index}`;
            }

            return new Array(count).fill(0).map(callback);
        }

        it('should export the expected static methods', () => {
            expect(ConstructBuilder._loadRecursive).to.be.a('function');
        });

        describe('_loadRecursive()', () => {
            it('should reject the promise if invoked without a valid DirInfo object', async () => {
                const inputs = _testValues.allButObject({});
                const error = 'Invalid directory (arg #1)';

                return Promise.map(inputs, (directory: any) => {
                    const ret = ConstructBuilder._loadRecursive(directory);

                    return expect(ret).to.have.been.rejectedWith(error);
                });
            });

            it('should read the contents of the specified directory', async () => {
                const dir = _createDirInfo();

                expect(_readdirStub).to.not.have.been.called;

                await ConstructBuilder._loadRecursive(dir);

                expect(_readdirStub).to.have.been.calledOnce;
                expect(_readdirStub.args[0]).to.have.length(2);
                expect(_readdirStub.args[0][0]).to.equal(dir.absPath);
                expect(_readdirStub.args[0][1]).to.deep.equal({
                    withFileTypes: true,
                });
            });

            it('should reject the promise if the directory read fails', async () => {
                const dir = _createDirInfo();
                const error = new Error('something went wrong!');

                // Make the readdir stub reject for this test
                _readdirStub.returns(Promise.reject(error));

                const ret = ConstructBuilder._loadRecursive(dir);

                await expect(ret).to.be.rejectedWith(error);
            });

            it('should ignore any entity that is not a file or a directory', async () => {
                const dir = _createDirInfo();
                const fileList = _buildFileList('.js', 5);
                const dirList = _buildFileList(undefined, 5);

                _readdirData[0] = _createDirList(dirList, fileList).map(
                    (item) => {
                        return Object.assign(item, {
                            isDirectory: () => false,
                            isFile: () => false,
                        });
                    },
                );

                expect(_readdirStub).to.not.have.been.called;
                expect(_loadModuleStub).to.not.have.been.called;

                await ConstructBuilder._loadRecursive(dir);

                expect(_readdirStub).to.have.been.calledOnce;
                expect(_loadModuleStub).to.not.have.been.called;
            });

            it('should ignore any entity that does not have a .js extension', async () => {
                const dir = _createDirInfo();
                const fileList = _buildFileList('java', 5);
                const dirList: string[] = [];

                _readdirData[0] = _createDirList(dirList, fileList);

                expect(_readdirStub).to.not.have.been.called;
                expect(_loadModuleStub).to.not.have.been.called;

                await ConstructBuilder._loadRecursive(dir);

                // No recursive calls to readdir because there are no child dirs
                expect(_readdirStub).to.have.been.calledOnce;
                expect(_loadModuleStub).to.not.have.been.called;
            });

            it('should load (require) each entity that has a .js extension', async () => {
                const dir = _createDirInfo();
                const fileList = _buildFileList('js', 5);
                const dirList: string[] = [];

                _readdirData[0] = _createDirList(dirList, fileList);

                expect(_readdirStub).to.not.have.been.called;
                expect(_loadModuleStub).to.not.have.been.called;

                await ConstructBuilder._loadRecursive(dir);

                // No recursive calls to readdir because there are no child dirs
                expect(_readdirStub).to.have.been.calledOnce;

                expect(_loadModuleStub).to.have.been.called;
                expect(_loadModuleStub.callCount).to.equal(fileList.length);

                fileList.forEach((file, index) => {
                    const modulePath = _path.resolve(dir.absPath, file);
                    expect(_loadModuleStub.args[index]).to.have.length(1);
                    expect(_loadModuleStub.args[index][0]).to.equal(modulePath);
                });
            });

            it('should reject the promise if any of the load operations fails', async () => {
                const dir = _createDirInfo();
                const fileList = _buildFileList('js', 5);
                const dirList: string[] = [];
                const error = new Error('something went wrong!');

                _readdirData[0] = _createDirList(dirList, fileList);
                _loadModuleStub.rejects(error);

                const ret = ConstructBuilder._loadRecursive(dir);

                await expect(ret).to.be.rejectedWith(error);
            });

            it('should recursively load data from every directory in the list', async () => {
                const dir = _createDirInfo();
                const fileList: string[] = [];
                const dirList = _buildFileList(undefined, 5);

                _readdirData[0] = _createDirList(dirList, fileList);
                // Add empty data for subdirectories
                dirList.forEach(() => _readdirData.push([]));

                const loadRecursiveSpy = _sinon.spy(
                    ConstructBuilder,
                    '_loadRecursive',
                );

                try {
                    await ConstructBuilder._loadRecursive(dir);

                    // Should be called once for the root dir + once for each subdir
                    expect(loadRecursiveSpy.callCount).to.equal(
                        dirList.length + 1,
                    );

                    // Check the calls for subdirectories (skip first call which is the root)
                    dirList.forEach((dirName, index) => {
                        const args = loadRecursiveSpy.args[index + 1];
                        const child = dir.createChild(dirName);

                        expect(args).to.have.length(1);
                        expect(args[0]).to.be.an.instanceof(DirInfo);
                        expect(args[0].absPath).to.equal(child.absPath);
                    });
                } finally {
                    loadRecursiveSpy.restore();
                }
            });

            it('should reject the promise if the recursive load call fails', async () => {
                const dir = _createDirInfo();
                const fileList: string[] = [];
                const dirList = _buildFileList(undefined, 1); // Use just 1 dir to make test simpler
                const error = new Error('something went wrong!');

                _readdirData[0] = _createDirList(dirList, fileList);

                // Make readdir fail on the second call (for the subdirectory)
                _readdirStub.onSecondCall().rejects(error);

                const ret = ConstructBuilder._loadRecursive(dir);

                await expect(ret).to.be.rejectedWith(error);
            });

            it('should return a list of initialized modules if the call succeeds', async () => {
                const dir = _createDirInfo();
                const dirTree = [
                    _createDirList(
                        ['child_1', 'child_2'],
                        [
                            'ignore-01.java',
                            'ignore-02.java',
                            'module-01.js',
                            'module-02.js',
                        ],
                    ),
                    _createDirList(
                        ['child_11'],
                        ['ignore-11.cs', 'module-11.js', 'module-12.js'],
                    ),
                    _createDirList(
                        [],
                        ['ignore-21.rs', 'module-21.js', 'module-22.js'],
                    ),
                    _createDirList(
                        [],
                        ['ignore-111.txt', 'module-111.js', 'module-112.js'],
                    ),
                ];
                _readdirData = dirTree;

                const expectedConstructs: ConstructFactory<Construct>[] = [];

                _loadModuleStub.callsFake((path: string) => {
                    const construct = new MockConstructFactory(path);
                    expectedConstructs.push(construct);
                    return construct;
                });

                const modules = await ConstructBuilder._loadRecursive(dir);

                expect(modules).to.have.length(expectedConstructs.length);

                modules.forEach((module: any, index: number) => {
                    expect(module).to.be.an('object');
                    expect(module.construct).to.be.an.instanceof(
                        ConstructFactory,
                    );
                    expect(expectedConstructs).to.deep.include(
                        module.construct,
                    );

                    expect(module.directory).to.be.an.instanceof(DirInfo);
                });
            });
        });
    });

    describe('ctor()', () => {
        it('should throw an error if invoked without a valid rootPath', () => {
            const inputs = _testValues.allButString('');
            const error = 'Invalid rootPath (arg #1)';

            inputs.forEach((rootPath: any) => {
                const wrapper = (): any => new ConstructBuilder(rootPath);

                expect(wrapper).to.throw(error);
            });
        });

        it('should return an object with the expected methods and properties', () => {
            const rootPath = _testValues.getString('rootPath');
            const builder = _createInstance(rootPath);

            expect(builder).to.be.an('object');
            expect(builder.build).to.be.a('function');
        });
    });

    describe('build()', () => {
        let _loadRecursiveStub: any;
        let _factoryModules: any;

        beforeEach(() => {
            _factoryModules = [];
            _loadRecursiveStub = _sinon
                .stub(ConstructBuilder, '_loadRecursive')
                .callsFake(() => _factoryModules);
        });

        afterEach(() => {
            _loadRecursiveStub.restore();
        });

        function _createScope(stackName = _testValues.getString('stackName')): {
            stackName: string;
        } {
            return { stackName };
        }

        it('should throw an error if invoked without a valid scope', async () => {
            const inputs = _testValues.allButObject();
            const error = 'Invalid scope (arg #1)';

            const result = Promise.map(inputs, (scope: any) => {
                const builder = _createInstance();

                const ret = builder.build(scope);
                return expect(ret).to.be.rejectedWith(error);
            });

            await expect(result).to.have.been.fulfilled;
        });

        it('should asynchronously load all of the factory modules', async () => {
            const rootPath = _testValues.getString('rootPath');
            const builder = _createInstance(rootPath);
            const scope = _createScope() as any;
            const expectedFactories = _createFactoryModules(10);

            _factoryModules = expectedFactories;

            expect(_loadRecursiveStub).to.not.have.been.called;

            await builder.build(scope, {});

            expect(_loadRecursiveStub).to.have.been.calledOnce;
            expect(_loadRecursiveStub.args[0][0]).to.be.an.instanceof(DirInfo);
            expect(_loadRecursiveStub.args[0][0].path).to.equal(rootPath);

            expect(builder._factoryModules).to.deep.equal(expectedFactories);
        });

        it('should reject the promise if the load recursive method fails', async () => {
            const rootPath = _testValues.getString('rootPath');
            const builder = _createInstance(rootPath);
            const scope = _createScope() as any;
            const expectedFactories = _createFactoryModules(10);
            const error = new Error('something went wrong!');

            _factoryModules = expectedFactories;

            _loadRecursiveStub.rejects(error);
            const ret = builder.build(scope, {});

            await expect(ret).to.be.rejectedWith(error);
        });

        it('should initialize all loaded construct factories with default props', async () => {
            const builder = _createInstance();
            const scope = _createScope() as any;
            _factoryModules = _createFactoryModules(10);

            const stubs = _factoryModules.map(
                ({ construct, directory }: any) => ({
                    init: _sinon.stub(construct, 'init').resolves(),
                    directory,
                }),
            );

            await builder.build(scope, {});

            stubs.forEach((stubs: any, index: number) => {
                const { init } = stubs;

                expect(init).to.have.been.calledOnce;
                expect(init.args[0]).to.have.length(2);
                expect(init.args[0][0]).to.equal(scope);
                expect(init.args[0][1]).to.deep.equal({});
            });
        });

        it('should initialize all loaded construct factories with specified props', async () => {
            const builder = _createInstance();
            const scope = _createScope() as any;
            _factoryModules = _createFactoryModules(10);

            const stubs = _factoryModules.map(
                ({ construct, directory }: any) => ({
                    init: _sinon.stub(construct, 'init').resolves(),
                    directory,
                }),
            );

            const props = {
                foo: _testValues.getString('foo'),
            };

            await builder.build(scope, props);

            stubs.forEach((stubs: any, index: number) => {
                const { init } = stubs;

                expect(init).to.have.been.calledOnce;
                expect(init.args[0]).to.have.length(2);
                expect(init.args[0][0]).to.equal(scope);
                expect(init.args[0][1]).to.deep.equal(props);
            });
        });

        it('should filter out any modules that are not constructs', async () => {
            const builder = _createInstance();
            const scope = _createScope() as any;
            _factoryModules = _createFactoryModules(10);

            _factoryModules.forEach(
                (factory: any) =>
                    (factory.construct = {
                        init: (): void => undefined,
                    }),
            );

            const stubs = _factoryModules.map(
                ({ construct, directory }: any) => ({
                    init: _sinon.stub(construct, 'init'),
                    directory,
                }),
            );

            const props = {
                foo: _testValues.getString('foo'),
            };

            await builder.build(scope, props);

            stubs.forEach((stubs: any, index: number) => {
                const { init } = stubs;

                expect(init).to.not.have.been.called;
            });
        });

        it('should reject the promise if any of the init methods fails', async () => {
            const builder = _createInstance();
            const scope = _createScope() as any;
            const error = new Error('something went wrong!');
            _factoryModules = _createFactoryModules(10);

            const failIndex = Math.floor(Math.random() * 10);

            _factoryModules.map(
                ({ construct, directory }: any, index: number) => {
                    const init = _sinon.stub(construct, 'init');
                    if (index === failIndex) {
                        init.rejects(error);
                    } else {
                        init.resolves();
                    }
                    return {
                        init,
                        directory,
                    };
                },
            );

            const ret = builder.build(scope, {});

            await expect(ret).to.be.rejectedWith(error);
        });

        it('should resolve the promise if all of the init methods succeed', async () => {
            const builder = _createInstance();
            const scope = _createScope() as any;
            _factoryModules = _createFactoryModules(10);

            _factoryModules.forEach(({ construct }: any) =>
                _sinon.stub(construct, 'init').resolves(),
            );

            const ret = builder.build(scope, {});

            await expect(ret).to.be.fulfilled;
        });
    });
});
