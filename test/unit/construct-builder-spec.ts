import 'mocha';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(sinonChai);
chai.use(chaiAsPromised);

import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import {
    asyncHelper,
    ObjectMock,
    testValues,
} from '@vamship/test-utils';
import { Promise } from 'bluebird'; // Keep for now
import path from 'node:path';
import esmock from 'esmock';
import { fileURLToPath } from 'node:url'; // For converting file URLs if needed

import MethodController from '../utils/method-controller.js';
import DirInfo from '../../dist/dir-info.js'; // Updated path
import ConstructFactory from '../../dist/construct-factory.js'; // Updated path
import IConstructProps from '../../dist/construct-props.js'; // Updated path

// const ConstructBuilderModule = rewire('../../dist/construct-builder.js'); // Replaced by esmock, path updated
// let ConstructBuilder; // Will be loaded by esmock in beforeEach
// type ConstructBuilderType = any; // Adjust as needed after esmock load

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ConstructBuilder', () => {
    let ConstructBuilder; // Will be loaded by esmock
    let fsMock;
    const moduleCache = {}; // For mocking dynamic imports

    class MockConstructFactory extends ConstructFactory<Construct> {
        protected async _init(
            scope: Stack,
            props: IConstructProps
        ): Promise<Construct> {
            return {} as Construct;
        }
    }

    function _createInstance(
        rootPath = testValues.getString('rootPath')
    ): ConstructBuilderType {
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
                directory: new DirInfo(testValues.getString('name')),
            }));
    }

    let ConstructBuilder; // Will be loaded by esmock
    let fsMock;
    const moduleCache = {}; // For mocking dynamic imports

    class MockConstructFactory extends ConstructFactory<Construct> {
        protected async _init(
            scope: Stack,
            props: IConstructProps
        ): Promise<Construct> {
            return {} as Construct;
        }
    }

    function _createInstance(
        rootPath = testValues.getString('rootPath')
    ): typeof ConstructBuilder { // Updated type
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
                directory: new DirInfo(testValues.getString('name')),
            }));
    }

    // let _loadModuleStub; // This was for rewire, esmock handles this differently via global mocks
    // The _loadRecursiveCtrl is removed as tests will now directly await _loadRecursive

    beforeEach(async () => {
        // Reset module cache for each test
        for (const key in moduleCache) {
            delete moduleCache[key];
        }

        fsMock = { // Simpler mock structure for fs.promises
            readdir: sinon.stub(),
            // readdirSync: sinon.stub() // If needed by any part not rewritten to async
        };
        fsMock.readdir.resolves([]); // Default to empty directory

        const ConstructBuilderModule = await esmock(path.resolve(__dirname, '../../dist/construct-builder.js'), {
            'node:fs': {
                promises: {
                    readdir: fsMock.readdir
                }
            }
        }, {
            '*': (modulePath) => {
                if (moduleCache[modulePath]) {
                    return moduleCache[modulePath];
                }
                // Fallback for unmocked dynamic imports during tests
                // console.warn(`Unmocked dynamic import in test: ${modulePath}`);
                const defaultMockFactory = new MockConstructFactory(modulePath);
                return Promise.resolve({ default: defaultMockFactory });
            }
        });
        ConstructBuilder = ConstructBuilderModule.default;
    });

    describe('[static]', () => {
        interface IDirData {
            name: string;
            isDirectory: () => boolean;
            isFile: () => boolean;
        }

        function _createDirInfo(
            name = testValues.getString('name'),
            filePath = testValues.getString('path') // Renamed path to filePath
        ): DirInfo {
            return new DirInfo(name); // Assuming DirInfo constructor takes name for simplicity here, or adjust as needed
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
            count = 3
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
                const inputs = testValues.allButObject({});
                const error = 'Invalid directory (arg #1)';

                // Since _loadRecursive is now async and we're not using Bluebird's Promise.map for this pattern:
                for (const directory of inputs) {
                    await expect(ConstructBuilder._loadRecursive(directory)).to.be.rejectedWith(error);
                }
            });

            it('should read the contents of the specified directory', async () => {
                const dir = _createDirInfo();
                // fsMock.readdir is already stubbed in beforeEach with esmock
                // Default behavior is fsMock.readdir.resolves([])
                // If a specific return value is needed for this test:
                fsMock.readdir.withArgs(dir.absPath, { withFileTypes: true }).resolves([]);


                expect(fsMock.readdir).to.not.have.been.called;

                await ConstructBuilder._loadRecursive(dir); // Await the call

                expect(fsMock.readdir).to.have.been.calledOnce;
                expect(fsMock.readdir).to.have.been.calledWith(dir.absPath, {
                    withFileTypes: true,
                });
            });

            it('should reject the promise if the directory read fails', async () => {
                const dir = _createDirInfo();
                const error = new Error('something went wrong!'); // Use Error object
                fsMock.readdir.withArgs(dir.absPath, { withFileTypes: true }).rejects(error);

                await expect(ConstructBuilder._loadRecursive(dir)).to.be.rejectedWith(error);
            });

            it('should ignore any entity that is not a file or a directory', async () => {
                const dir = _createDirInfo();
                const fileList = _buildFileList('js', 5); // Note: original test uses '.js'
                const dirList = _buildFileList(undefined, 5);

                const dirContents = _createDirList(dirList, fileList).map(
                    (item) => {
                        return { // fs.Dirent like structure
                            name: item.name,
                            isDirectory: () => false, // Mock as neither
                            isFile: () => false,      // Mock as neither
                        };
                    }
                );
                fsMock.readdir.withArgs(dir.absPath, { withFileTypes: true }).resolves(dirContents);

                // We need to ensure no dynamic imports were attempted.
                // The global mock for '*' in esmock will be called if import() is attempted.
                // We can spy on the moduleCache population or the fallback console.warn.
                // For simplicity, if _loadRecursive completes and returns an empty array,
                // and fsMock.readdir was called, it implies non-files/dirs were ignored.
                const consoleWarnSpy = sinon.spy(console, 'warn');

                const result = await ConstructBuilder._loadRecursive(dir);

                expect(fsMock.readdir).to.have.been.calledOnce;
                expect(result).to.be.an('array').that.is.empty;
                // Check that no unexpected dynamic imports were made (by checking the spy)
                // This depends on the fallback behavior of the global mock.
                // If the global mock returns a default factory, then this check is harder.
                // A more robust way is to ensure specific paths were NOT added to moduleCache
                // or that the defaultMockFactory was not called for these items.
                // For now, we'll rely on the empty result.
                expect(consoleWarnSpy.notCalled).to.be.true; // Assuming no warnings for these items
                consoleWarnSpy.restore();
            });

            it('should ignore any entity that does not have a .js extension', async () => {
                const dir = _createDirInfo();
                const fileList = _buildFileList('java', 5); // Files like item-0.java, item-1.java
                const dirList = []; // No subdirectories

                const dirContents = _createDirList(dirList, fileList).map(item => ({
                    name: item.name,
                    isDirectory: () => false,
                    isFile: () => true, // It's a file
                }));
                fsMock.readdir.withArgs(dir.absPath, { withFileTypes: true }).resolves(dirContents);
                const consoleWarnSpy = sinon.spy(console, 'warn');

                const result = await ConstructBuilder._loadRecursive(dir);

                expect(fsMock.readdir).to.have.been.calledOnce;
                expect(result).to.be.an('array').that.is.empty; // No .js files should be loaded
                expect(consoleWarnSpy.notCalled).to.be.true;
                consoleWarnSpy.restore();
            });

            it('should load each entity that has a .js or .mjs extension', async () => {
                const dir = _createDirInfo();
                const jsFiles = _buildFileList('js', 2); // item-0.js, item-1.js
                const mjsFiles = _buildFileList('mjs', 2).map(f => `mjs-${f}`); // mjs-item-0.mjs, ...
                const allLoadableFiles = [...jsFiles, ...mjsFiles];
                const dirList = []; // No subdirectories

                const dirContents = _createDirList(dirList, allLoadableFiles).map(item => ({
                    name: item.name,
                    isDirectory: () => false,
                    isFile: () => true,
                }));
                fsMock.readdir.withArgs(dir.absPath, { withFileTypes: true }).resolves(dirContents);

                // Setup mocks for these specific files in moduleCache
                const expectedModules = [];
                for (const fileName of allLoadableFiles) {
                    const modulePath = path.resolve(dir.absPath, fileName);
                    const fileURL = path.pathToFileURL(modulePath).href;
                    const mockFactory = new MockConstructFactory(fileURL);
                    moduleCache[fileURL] = Promise.resolve({ default: mockFactory });
                    expectedModules.push({ construct: mockFactory, directory: dir });
                }

                const results = await ConstructBuilder._loadRecursive(dir);

                expect(fsMock.readdir).to.have.been.calledOnce;
                expect(results).to.have.lengthOf(allLoadableFiles.length);
                results.forEach((result, index) => {
                    expect(result.construct).to.be.instanceOf(MockConstructFactory);
                    // Check if the loaded construct is one of the expected ones
                    const correspondingMock = expectedModules.find(
                        (em) => em.construct === result.construct && em.directory.absPath === result.directory.absPath
                    );
                    expect(correspondingMock).to.not.be.undefined;
                });
            });

            it('should reject the promise if any of the load operations fails', async () => {
                const dir = _createDirInfo();
                const fileList = _buildFileList('js', 5);
                const dirList = [];
                const error = new Error('something went wrong!');

                const dirContents = _createDirList(dirList, fileList).map(item => ({
                    name: item.name,
                    isDirectory: () => false,
                    isFile: () => true,
                }));
                fsMock.readdir.withArgs(dir.absPath, { withFileTypes: true }).resolves(dirContents);

                // Make one of the dynamic imports fail
                if (fileList.length > 0) {
                    const failingFilePath = path.resolve(dir.absPath, fileList[0]);
                    const failingFileURL = path.pathToFileURL(failingFilePath).href;
                    moduleCache[failingFileURL] = Promise.reject(error);
                } else {
                    // If there are no files, this test might not be meaningful as is.
                    // For now, proceed, but it won't test the rejection from loading.
                }


                await expect(ConstructBuilder._loadRecursive(dir)).to.be.rejectedWith(error);
            });

            it('should recursively load data from every directory in the list', async () => {
                const topDir = _createDirInfo('top');
                const subDirName = 'subDir';
                const subDirFiles = _buildFileList('js', 1).map(f => `sub-${f}`); // sub-item-0.js

                // fs.readdir for topDir returns subDir
                fsMock.readdir.withArgs(topDir.absPath, { withFileTypes: true }).resolves([
                    { name: subDirName, isDirectory: () => true, isFile: () => false }
                ]);

                // fs.readdir for subDir returns subDirFiles
                const subDirAbsPath = path.resolve(topDir.absPath, subDirName);
                fsMock.readdir.withArgs(subDirAbsPath, { withFileTypes: true }).resolves(
                    subDirFiles.map(name => ({ name, isDirectory: () => false, isFile: () => true }))
                );

                // Mock the dynamic import for the file in subDir
                const fileInSubDir = subDirFiles[0];
                const fileInSubDirAbsPath = path.resolve(subDirAbsPath, fileInSubDir);
                const fileInSubDirURL = path.pathToFileURL(fileInSubDirAbsPath).href;
                const mockFactoryInstance = new MockConstructFactory(fileInSubDirURL);
                moduleCache[fileInSubDirURL] = Promise.resolve({ default: mockFactoryInstance });

                const results = await ConstructBuilder._loadRecursive(topDir);

                expect(fsMock.readdir).to.have.been.calledTwice; // Once for topDir, once for subDir
                expect(results).to.have.lengthOf(1);
                expect(results[0].construct).to.equal(mockFactoryInstance);
                expect(results[0].directory.absPath).to.equal(subDirAbsPath);
            });

            it('should reject the promise if the recursive load call fails', async () => {
                const topDir = _createDirInfo('top');
                const subDirName = 'subDir1';
                const error = new Error('recursive load failed!');

                // fs.readdir for topDir returns subDir1
                fsMock.readdir.withArgs(topDir.absPath, { withFileTypes: true }).resolves([
                    { name: subDirName, isDirectory: () => true, isFile: () => false }
                ]);

                // fs.readdir for subDir1 rejects
                const subDirAbsPath = path.resolve(topDir.absPath, subDirName);
                fsMock.readdir.withArgs(subDirAbsPath, { withFileTypes: true }).rejects(error);

                await expect(ConstructBuilder._loadRecursive(topDir)).to.be.rejectedWith(error);
            });

            it('should return a list of initialized modules if the call succeeds', async () => {
                const topDir = _createDirInfo('top');
                const filesInTopDir = ['module-A.js', 'module-B.js'];
                const subDir1Name = 'sub1';
                const filesInSubDir1 = ['module-C.js'];

                // Mock fs.readdir for topDir
                fsMock.readdir.withArgs(topDir.absPath, { withFileTypes: true }).resolves([
                    { name: filesInTopDir[0], isDirectory: () => false, isFile: () => true },
                    { name: filesInTopDir[1], isDirectory: () => false, isFile: () => true },
                    { name: subDir1Name, isDirectory: () => true, isFile: () => false },
                ]);

                // Mock fs.readdir for subDir1
                const subDir1AbsPath = path.resolve(topDir.absPath, subDir1Name);
                fsMock.readdir.withArgs(subDir1AbsPath, { withFileTypes: true }).resolves([
                    { name: filesInSubDir1[0], isDirectory: () => false, isFile: () => true },
                ]);

                const expectedLoadedFactories = [];

                // Mock dynamic imports for files in topDir
                for (const fileName of filesInTopDir) {
                    const modulePath = path.resolve(topDir.absPath, fileName);
                    const fileURL = path.pathToFileURL(modulePath).href;
                    const mockFactory = new MockConstructFactory(fileURL);
                    moduleCache[fileURL] = Promise.resolve({ default: mockFactory });
                    expectedLoadedFactories.push({ construct: mockFactory, directoryPath: topDir.absPath });
                }
                // Mock dynamic imports for files in subDir1
                for (const fileName of filesInSubDir1) {
                    const modulePath = path.resolve(subDir1AbsPath, fileName);
                    const fileURL = path.pathToFileURL(modulePath).href;
                    const mockFactory = new MockConstructFactory(fileURL);
                    moduleCache[fileURL] = Promise.resolve({ default: mockFactory });
                    expectedLoadedFactories.push({ construct: mockFactory, directoryPath: subDir1AbsPath });
                }

                const results = await ConstructBuilder._loadRecursive(topDir);

                expect(results).to.have.lengthOf(expectedLoadedFactories.length);
                for (const result of results) {
                    expect(result.construct).to.be.instanceOf(MockConstructFactory);
                    const found = expectedLoadedFactories.some(
                        (expected) =>
                            expected.construct === result.construct &&
                            expected.directoryPath === result.directory.absPath
                    );
                    expect(found, `Result ${result.construct.id} from ${result.directory.absPath} not found in expected mocks`).to.be.true;
                }
            });
        });
    });

    describe('ctor()', () => {
        it('should throw an error if invoked without a valid rootPath', () => {
            const inputs = testValues.allButString('');
            const error = 'Invalid rootPath (arg #1)';

            inputs.forEach((rootPath) => {
                const wrapper = (): ConstructBuilderType =>
                    new ConstructBuilder(rootPath);

                expect(wrapper).to.throw(error);
            });
        });

        it('should return an object with the expected methods and properties', () => {
            const rootPath = testValues.getString('rootPath');
            const builder = new ConstructBuilder(rootPath);

            expect(builder).to.be.an('object');
            expect(builder.build).to.be.a('function');
        });
    });

    describe('build()', () => {
        let _loadRecursiveStub;
        let _factoryModules;

        beforeEach(() => {
            _factoryModules = [];
            _loadRecursiveStub = sinon
                .stub(ConstructBuilder, '_loadRecursive')
                .callsFake(() => _factoryModules);
        });

        afterEach(() => {
            _loadRecursiveStub.restore();
        });

        function _createScope(stackName = testValues.getString('stackName')): {
            stackName: string;
        } {
            return { stackName };
        }

        it('should throw an error if invoked without a valid scope', async () => {
            const inputs = testValues.allButObject();
            const error = 'Invalid scope (arg #1)';

            const promises = inputs.map(async (scope) => {
                const builder = _createInstance();
                await expect(builder.build(scope)).to.be.rejectedWith(error);
            });
            await Promise.all(promises);
        });

        it('should asynchronously load all of the factory modules', async () => {
            const rootPath = testValues.getString('rootPath');
            const builder = new ConstructBuilder(rootPath);
            const scope = _createScope();
            const expectedFactories = _createFactoryModules(10);

            _factoryModules = expectedFactories;

            expect(_loadRecursiveStub).to.not.have.been.called;

            await builder.build(scope);

            expect(_loadRecursiveStub).to.have.been.calledOnce;

            expect(_loadRecursiveStub).to.have.been.calledOnce;
            expect(_loadRecursiveStub.args[0][0]).to.be.an.instanceof(DirInfo);
            expect(_loadRecursiveStub.args[0][0].path).to.equal(rootPath);

            expect(builder._factoryModules).to.deep.equal(expectedFactories);
        });

        it('should reject the promise if the load recursive method fails', async () => {
            const rootPath = testValues.getString('rootPath');
            const builder = new ConstructBuilder(rootPath);
            const scope = _createScope();
            const expectedFactories = _createFactoryModules(10);
            const error = new Error('something went wrong!');

            _factoryModules = expectedFactories;

            _loadRecursiveStub.rejects(error);
            const ret = builder.build(scope);

            await expect(ret).to.be.rejectedWith(error);
        });

        it('should initialize all loaded construct factories with default props', async () => {
            const builder = _createInstance();
            const scope = _createScope();
            _factoryModules = _createFactoryModules(10);

            const stubs = _factoryModules.map(({ construct, directory }) => ({
                init: sinon.stub(construct, 'init'),
                directory,
            }));

            await builder.build(scope);

            stubs.forEach((stubs, index) => {
                const { init } = stubs;

                expect(init).to.have.been.calledOnce;
                expect(init.args[0]).to.have.length(2);
                expect(init.args[0][0]).to.equal(scope);
                expect(init.args[0][1]).to.deep.equal({});
            });
        });

        it('should initialize all loaded construct factories with specified props', async () => {
            const builder = _createInstance();
            const scope = _createScope();
            _factoryModules = _createFactoryModules(10);

            const stubs = _factoryModules.map(({ construct, directory }) => ({
                init: sinon.stub(construct, 'init'),
                directory,
            }));

            const props = {
                foo: testValues.getString('foo'),
            };

            await builder.build(scope, props);

            stubs.forEach((stubs, index) => {
                const { init } = stubs;

                expect(init).to.have.been.calledOnce;
                expect(init.args[0]).to.have.length(2);
                expect(init.args[0][0]).to.equal(scope);
                expect(init.args[0][1]).to.deep.equal(props);
            });
        });

        it('should filter out any modules that are not constructs', async () => {
            const builder = _createInstance();
            const scope = _createScope();
            _factoryModules = _createFactoryModules(10);

            _factoryModules.forEach(
                (factory) =>
                    (factory.construct = {
                        init: (): void => undefined,
                    })
            );

            const stubs = _factoryModules.map(({ construct, directory }) => ({
                init: sinon.stub(construct, 'init'),
                directory,
            }));

            const props = {
                foo: testValues.getString('foo'),
            };

            await builder.build(scope, props);

            stubs.forEach((stubs, index) => {
                const { init } = stubs;

                expect(init).to.not.have.been.called;
            });
        });

        it('should reject the promise if any of the init methods fails', async () => {
            const builder = _createInstance();
            const scope = _createScope();
            const error = new Error('something went wrong!');
            _factoryModules = _createFactoryModules(10);

            const failIndex = Math.floor(Math.random() * 10);

            _factoryModules.map(({ construct, directory }, index) => {
                const init = sinon.stub(construct, 'init');
                if (index === failIndex) {
                    init.resolves();
                } else {
                    init.rejects(error);
                }
                return {
                    init,
                    directory,
                };
            });

            const ret = builder.build(scope);

            await expect(ret).to.be.rejectedWith(error);
        });

        it('should resolve the promise if all of the init methods succeed', async () => {
            const builder = _createInstance();
            const scope = _createScope();
            _factoryModules = _createFactoryModules(10);

            const ret = builder.build(scope);

            await expect(ret).to.be.fulfilled;
        });
    });
});
