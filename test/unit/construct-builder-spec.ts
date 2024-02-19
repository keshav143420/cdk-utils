import { expect, use as _useWithChai } from 'chai';
import _sinonChai from 'sinon-chai';
import _chaiAsPromised from 'chai-as-promised';
import 'mocha';

_useWithChai(_sinonChai);
_useWithChai(_chaiAsPromised);

import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import {
    asyncHelper as _asyncHelper,
    ObjectMock,
    MockImportHelper,
    testValues as _testValues,
} from '@vamship/test-utils';
import bluebird from 'bluebird';
import _path from 'path';
import _esmock from 'esmock';

import MethodController from '../utils/method-controller.js';
import DirInfo from '../../src/dir-info.js';
import ConstructFactory from '../../src/construct-factory.js';
import IConstructProps from '../../src/construct-props.js';
import ConstructBuilder from '../../src/construct-builder.js';
import { MyNewType } from '../../src/types/MyNewType.js';

// const ConstructBuilderModule = _rewire('../../src/construct-builder');
// const ConstructBuilder = ConstructBuilderModule.default;
type ConstructBuilderType = typeof ConstructBuilder;
const { Promise } = bluebird;
describe.only('ConstructBuilder', () => {
    // class MockConstructFactory extends ConstructFactory<Construct> {
    //     protected async _init(
    //         scope: Stack,
    //         props: IConstructProps
    //     ): Promise<Construct> {
    //         return {} as Construct;
    //     }
    // }

    // function _createInstance(
    //     rootPath = _testValues.getString('rootPath')
    // ): ConstructBuilder {
    //     return new ConstructBuilder(rootPath);
    // }

    // function _createFactoryModules(count: number): Array<{
    //     construct: MockConstructFactory;
    //     directory: DirInfo;
    // }> {
    //     return new Array(count)
    //         .fill(0)
    //         .map((item, index) => new MockConstructFactory(`factory-${index}`))
    //         .map((construct) => ({
    //             construct,
    //             directory: new DirInfo(_testValues.getString('name')),
    //         }));
    // }

    // let _fsMock:ObjectMock<any>;
    // let _loadModuleStub;
    // const _loadRecursiveCtrl = new MethodController(
    //     {
    //         READ_DIR: 0,
    //         END: 1,
    //     },
    //     function* resolver(iteration) {
    //         const readdirMethod = _fsMock.mocks.readdir;

    //         const callback = readdirMethod.stub.args[iteration][2];
    //         yield callback(null, _fsMock.__dirData[iteration]);
    //     }
    // );
    // type TargetModule = {
    //     /* eslint-disable-next-line tsel/no-explicit-any */
    //     build: (scope: Stack, props: IConstructProps) => Promise<void[]>
    // };
    type ImportResult = {
        testTarget: typeof ConstructBuilder;
    };

    async function _import(): Promise<ImportResult> {
        const importHelper = new MockImportHelper<ConstructBuilder>(
            'project://src/construct-builder.js',
            {},
            import.meta.resolve('../../../working'),
        );

        const testTarget = await _esmock(
            importHelper.importPath,
            importHelper.getLibs(),
            importHelper.getGlobals(),
        );

        return { testTarget };
    }
    // beforeEach(() => {
    //     _fsMock = new ObjectMock()
    //         .addMock('readdir')
    //         .addMock('readdirSync', () => {
    //             const data = _fsMock.__dirData[_fsMock.__callIndex];
    //             _fsMock.__callIndex++;

    //             return data;
    //         });
    //     _fsMock.__callIndex = 0;
    //     _fsMock.__dirData = [[]];

    //     ConstructBuilderModule.__set__('fs_1', {
    //         default: _fsMock.instance,
    //     });

    //     _loadModuleStub = _sinon.stub();

    //     ConstructBuilderModule.__set__('_loadModule', _loadModuleStub);
    // });

    describe('[static]', () => {
        // interface IDirData {
        //     name: string;
        //     isDirectory: () => boolean;
        //     isFile: () => boolean;
        // }

        // function _createDirInfo(
        //     name = _testValues.getString('name'),
        //     path = _testValues.getString('path')
        // ): DirInfo {
        //     return new DirInfo(name);
        // }

        // function _createDirList(dirs: string[], files: string[]): IDirData[] {
        //     const dirList: IDirData[] = [];

        //     dirs = dirs || [];
        //     files = files || [];

        //     dirs.reduce((result, item, index) => {
        //         result.push({
        //             name: item,
        //             isDirectory: () => true,
        //             isFile: () => false,
        //         });
        //         return dirList;
        //     }, dirList);

        //     files.reduce((result, item, index) => {
        //         result.push({
        //             name: item,
        //             isDirectory: () => false,
        //             isFile: () => true,
        //         });
        //         return dirList;
        //     }, dirList);

        //     return dirList;
        // }

        // function _buildFileList(
        //     callback:
        //         | string
        //         | ((item: string, index: number) => string)
        //         | undefined,
        //     count = 3
        // ): string[] {
        //     if (typeof callback === 'string') {
        //         const extension = callback;
        //         callback = (item, index): string =>
        //             `item-${index}.${extension}`;
        //     } else if (typeof callback !== 'function') {
        //         callback = (item, index): string => `item-${index}`;
        //     }

        //     return new Array(count).fill(0).map(callback);
        // }

        it('should export the expected static methods', async function () {
            const { testTarget: TargetClass } = await _import();
            const manager = new TargetClass('filepath');

            // Duck type checking because esmock messes with the prototype chain
            expect(manager.build).to.be.a('function');
        });

        // describe('_loadRecursive()', () => {
        // it('should reject the promise if invoked without a valid DirInfo object', async function () {
        //     const inputs = _testValues.allButObject({});
        //     const error = 'Invalid directory (arg #1)';
        //     const {
        //         testTarget
        //     } = await _import();
        //     const instance = new testTarget("test123");
        //     const dirInfo = new DirInfo('dash')

        //     return Promise.map(inputs, (directory:DirInfo) => {
        //         const ret = ConstructBuilder._loadRecursive(directory);

        //         return expect(ret).to.have.been.rejectedWith(error);
        //     });
        // });

        //     it('should read the contents of the specified directory', async () => {
        //         const readdirMethod = _fsMock.mocks.readdir;
        //         const dir = _createDirInfo();

        //         expect(readdirMethod.stub).to.not.have.been.called;

        //         ConstructBuilder._loadRecursive(dir);

        //         await _loadRecursiveCtrl.resolveUntil(
        //             _loadRecursiveCtrl.steps.READ_DIR
        //         );

        //         expect(readdirMethod.stub).to.have.been.calledOnce;
        //         expect(readdirMethod.stub.args[0]).to.have.length(3);
        //         expect(readdirMethod.stub.args[0][0]).to.equal(dir.absPath);
        //         expect(readdirMethod.stub.args[0][1]).to.deep.equal({
        //             withFileTypes: true,
        //         });
        //     });

        //     it('should reject the promise if the directory read fails', async () => {
        //         const readdirMethod = _fsMock.mocks.readdir;
        //         const dir = _createDirInfo();
        //         const error = 'something went wrong!';

        //         expect(readdirMethod.stub).to.not.have.been.called;

        //         const ret = ConstructBuilder._loadRecursive(dir);
        //         await _loadRecursiveCtrl.resolveUntil(
        //             _loadRecursiveCtrl.steps.READ_DIR
        //         );

        //         const callback = readdirMethod.stub.args[0][2];
        //         callback(error);

        //         await expect(ret).to.be.rejectedWith(error);
        //     });

        //     it('should ignore any entity that is not a file or a directory', async () => {
        //         const readdirMethod = _fsMock.mocks.readdir;
        //         const dir = _createDirInfo();
        //         const fileList = _buildFileList('.js', 5);
        //         const dirList = _buildFileList(undefined, 5);

        //         _fsMock.__dirData[0] = _createDirList(dirList, fileList).map(
        //             (item) => {
        //                 return Object.assign(item, {
        //                     isDirectory: () => false,
        //                     isFile: () => false,
        //                 });
        //             }
        //         );

        //         expect(readdirMethod.stub).to.not.have.been.called;
        //         expect(_loadModuleStub).to.not.have.been.called;

        //         ConstructBuilder._loadRecursive(dir);
        //         await _loadRecursiveCtrl.resolveUntil(
        //             _loadRecursiveCtrl.steps.END
        //         );

        //         expect(readdirMethod.stub).to.have.been.calledOnce;
        //         expect(_loadModuleStub).to.not.have.been.called;
        //     });

        //     it('should ignore any entity that does not have a .js extension', async () => {
        //         const readdirMethod = _fsMock.mocks.readdir;
        //         const dir = _createDirInfo();
        //         const fileList = _buildFileList('java', 5);
        //         const dirList = [];

        //         _fsMock.__dirData[0] = _createDirList(dirList, fileList);

        //         expect(readdirMethod.stub).to.not.have.been.called;
        //         expect(_loadModuleStub).to.not.have.been.called;

        //         ConstructBuilder._loadRecursive(dir);
        //         await _loadRecursiveCtrl.resolveUntil(
        //             _loadRecursiveCtrl.steps.END
        //         );

        //         // No recursive calls to readdir because there are no child dirs
        //         expect(readdirMethod.stub).to.have.been.calledOnce;
        //         expect(_loadModuleStub).to.not.have.been.called;
        //     });

        //     it('should load (require) each entity that has a .js extension', async () => {
        //         const readdirMethod = _fsMock.mocks.readdir;
        //         const dir = _createDirInfo();
        //         const fileList = _buildFileList('js', 5);
        //         const dirList = [];

        //         _fsMock.__dirData[0] = _createDirList(dirList, fileList);

        //         expect(readdirMethod.stub).to.not.have.been.called;
        //         expect(_loadModuleStub).to.not.have.been.called;

        //         ConstructBuilder._loadRecursive(dir);
        //         await _loadRecursiveCtrl
        //             .resolveUntil(_loadRecursiveCtrl.steps.END)
        //             .then(_asyncHelper.wait(10));

        //         // No recursive calls to readdir because there are no child dirs
        //         expect(readdirMethod.stub).to.have.been.calledOnce;

        //         expect(_loadModuleStub).to.have.been.called;
        //         expect(_loadModuleStub.callCount).to.equal(fileList.length);

        //         fileList.forEach((file, index) => {
        //             const modulePath = _path.resolve(dir.absPath, file);
        //             expect(_loadModuleStub.args[index]).to.have.length(1);
        //             expect(_loadModuleStub.args[index][0]).to.equal(modulePath);
        //         });
        //     });

        //     it('should reject the promise if any of the load operations fails', async () => {
        //         const dir = _createDirInfo();
        //         const fileList = _buildFileList('js', 5);
        //         const dirList = [];
        //         const error = new Error('something went wrong!');

        //         _fsMock.__dirData[0] = _createDirList(dirList, fileList);
        //         _loadModuleStub.throws(error);

        //         const ret = ConstructBuilder._loadRecursive(dir);
        //         try {
        //             await _loadRecursiveCtrl.resolveUntil(
        //                 _loadRecursiveCtrl.steps.END
        //             );
        //         } catch (ex) {
        //             // Eat exception.
        //         }

        //         await expect(ret).to.be.rejectedWith(error);
        //     });

        //     it('should recursively load data from every directory in the list', async () => {
        //         const dir = _createDirInfo();
        //         const fileList = [];
        //         const dirList = _buildFileList(undefined, 5);

        //         _fsMock.__dirData[0] = _createDirList(dirList, fileList);

        //         ConstructBuilder._loadRecursive(dir);
        //         const loadRecursiveStub = _sinon.stub(
        //             ConstructBuilder,
        //             '_loadRecursive'
        //         );

        //         try {
        //             expect(loadRecursiveStub).to.not.have.been.called;

        //             await _loadRecursiveCtrl.resolveUntil(
        //                 _loadRecursiveCtrl.steps.END
        //             );

        //             expect(loadRecursiveStub).to.have.been.called;
        //             expect(loadRecursiveStub.callCount).to.equal(
        //                 dirList.length
        //             );

        //             dirList.forEach((dirName, index) => {
        //                 const args = loadRecursiveStub.args[index];
        //                 const child = dir.createChild(dirName);

        //                 expect(args).to.have.length(1);
        //                 expect(args[0]).to.be.an.instanceof(DirInfo);
        //                 expect(args[0].absPath).to.equal(child.absPath);
        //             });
        //         } finally {
        //             loadRecursiveStub.restore();
        //         }
        //     });

        //     it('should reject the promise if the recursive load call fails', async () => {
        //         const dir = _createDirInfo();
        //         const fileList = [];
        //         const dirList = _buildFileList(undefined, 5);
        //         const error = new Error('something went wrong!');

        //         _fsMock.__dirData[0] = _createDirList(dirList, fileList);

        //         const ret = ConstructBuilder._loadRecursive(dir);
        //         const loadRecursiveStub = _sinon.stub(
        //             ConstructBuilder,
        //             '_loadRecursive'
        //         );

        //         try {
        //             loadRecursiveStub.throws(error);

        //             await _loadRecursiveCtrl
        //                 .resolveUntil(_loadRecursiveCtrl.steps.END)
        //                 .catch((ex) => {
        //                     /* Do nothing */
        //                 });
        //             await expect(ret).to.be.rejectedWith(error);
        //         } finally {
        //             loadRecursiveStub.restore();
        //         }
        //     });

        //     it('should return a list of initialized modules if the call succeeds', async () => {
        //         const dir = _createDirInfo();
        //         const dirTree = [
        //             _createDirList(
        //                 ['child_1', 'child_2'],
        //                 [
        //                     'ignore-01.java',
        //                     'ignore-02.java',
        //                     'module-01.js',
        //                     'module-02.js',
        //                 ]
        //             ),
        //             _createDirList(
        //                 ['child_11'],
        //                 ['ignore-11.cs', 'module-11.js', 'module-12.js']
        //             ),
        //             _createDirList(
        //                 [],
        //                 ['ignore-21.rs', 'module-21.js', 'module-22.js']
        //             ),
        //             _createDirList(
        //                 [],
        //                 ['ignore-111.txt', 'module-111.js', 'module-112.js']
        //             ),
        //         ];
        //         _fsMock.__dirData = dirTree;

        //         const expectedConstructs: ConstructFactory<Construct>[] = [];

        //         _loadModuleStub.callsFake((path) => {
        //             const construct = new MockConstructFactory(path);
        //             expectedConstructs.push(construct);
        //             return construct;
        //         });

        //         const ret = ConstructBuilder._loadRecursive(dir);

        //         await Promise.mapSeries(dirTree, async (item, iteration) => {
        //             await _loadRecursiveCtrl.resolveUntil(
        //                 _loadRecursiveCtrl.steps.END,
        //                 iteration
        //             );
        //             await _asyncHelper.wait(10)();
        //         });

        //         const modules = await expect(ret).to.have.been.fulfilled;
        //         expect(modules).to.have.length(expectedConstructs.length);

        //         modules.forEach((module, index) => {
        //             expect(module).to.be.an('object');
        //             expect(module.construct).to.be.an.instanceof(
        //                 ConstructFactory
        //             );
        //             expect(expectedConstructs).to.deep.include(
        //                 module.construct
        //             );

        //             expect(module.directory).to.be.an.instanceof(DirInfo);
        //         });
        //     });
        // });
    });

    // describe('ctor()', () => {
    //     it('should throw an error if invoked without a valid rootPath', () => {
    //         const inputs = _testValues.allButString('');
    //         const error = 'Invalid rootPath (arg #1)';

    //         inputs.forEach((rootPath) => {
    //             const wrapper = (): ConstructBuilderType =>
    //                 new ConstructBuilder(rootPath);

    //             expect(wrapper).to.throw(error);
    //         });
    //     });

    //     it('should return an object with the expected methods and properties', () => {
    //         const rootPath = _testValues.getString('rootPath');
    //         const builder = new ConstructBuilder(rootPath);

    //         expect(builder).to.be.an('object');
    //         expect(builder.build).to.be.a('function');
    //     });
    // });

    // describe('build()', () => {
    //     let _loadRecursiveStub;
    //     let _factoryModules;

    //     beforeEach(() => {
    //         _factoryModules = [];
    //         _loadRecursiveStub = _sinon
    //             .stub(ConstructBuilder, '_loadRecursive')
    //             .callsFake(() => _factoryModules);
    //     });

    //     afterEach(() => {
    //         _loadRecursiveStub.restore();
    //     });

    //     function _createScope(stackName = _testValues.getString('stackName')): {
    //         stackName: string;
    //     } {
    //         return { stackName };
    //     }

    //     it('should throw an error if invoked without a valid scope', async () => {
    //         const inputs = _testValues.allButObject();
    //         const error = 'Invalid scope (arg #1)';

    //         const result = Promise.map(inputs, (scope) => {
    //             const builder = _createInstance();

    //             const ret = builder.build(scope);
    //             return expect(ret).to.be.rejectedWith(error);
    //         });

    //         await expect(result).to.have.been.fulfilled;
    //     });

    //     it('should asynchronously load all of the factory modules', async () => {
    //         const rootPath = _testValues.getString('rootPath');
    //         const builder = new ConstructBuilder(rootPath);
    //         const scope = _createScope();
    //         const expectedFactories = _createFactoryModules(10);

    //         _factoryModules = expectedFactories;

    //         expect(_loadRecursiveStub).to.not.have.been.called;

    //         await builder.build(scope);

    //         expect(_loadRecursiveStub).to.have.been.calledOnce;

    //         expect(_loadRecursiveStub).to.have.been.calledOnce;
    //         expect(_loadRecursiveStub.args[0][0]).to.be.an.instanceof(DirInfo);
    //         expect(_loadRecursiveStub.args[0][0].path).to.equal(rootPath);

    //         expect(builder._factoryModules).to.deep.equal(expectedFactories);
    //     });

    //     it('should reject the promise if the load recursive method fails', async () => {
    //         const rootPath = _testValues.getString('rootPath');
    //         const builder = new ConstructBuilder(rootPath);
    //         const scope = _createScope();
    //         const expectedFactories = _createFactoryModules(10);
    //         const error = new Error('something went wrong!');

    //         _factoryModules = expectedFactories;

    //         _loadRecursiveStub.rejects(error);
    //         const ret = builder.build(scope);

    //         await expect(ret).to.be.rejectedWith(error);
    //     });

    //     it('should initialize all loaded construct factories with default props', async () => {
    //         const builder = _createInstance();
    //         const scope = _createScope();
    //         _factoryModules = _createFactoryModules(10);

    //         const stubs = _factoryModules.map(({ construct, directory }) => ({
    //             init: _sinon.stub(construct, 'init'),
    //             directory,
    //         }));

    //         await builder.build(scope);

    //         stubs.forEach((stubs, index) => {
    //             const { init } = stubs;

    //             expect(init).to.have.been.calledOnce;
    //             expect(init.args[0]).to.have.length(2);
    //             expect(init.args[0][0]).to.equal(scope);
    //             expect(init.args[0][1]).to.deep.equal({});
    //         });
    //     });

    //     it('should initialize all loaded construct factories with specified props', async () => {
    //         const builder = _createInstance();
    //         const scope = _createScope();
    //         _factoryModules = _createFactoryModules(10);

    //         const stubs = _factoryModules.map(({ construct, directory }) => ({
    //             init: _sinon.stub(construct, 'init'),
    //             directory,
    //         }));

    //         const props = {
    //             foo: _testValues.getString('foo'),
    //         };

    //         await builder.build(scope, props);

    //         stubs.forEach((stubs, index) => {
    //             const { init } = stubs;

    //             expect(init).to.have.been.calledOnce;
    //             expect(init.args[0]).to.have.length(2);
    //             expect(init.args[0][0]).to.equal(scope);
    //             expect(init.args[0][1]).to.deep.equal(props);
    //         });
    //     });

    //     it('should filter out any modules that are not constructs', async () => {
    //         const builder = _createInstance();
    //         const scope = _createScope();
    //         _factoryModules = _createFactoryModules(10);

    //         _factoryModules.forEach(
    //             (factory) =>
    //                 (factory.construct = {
    //                     init: (): void => undefined,
    //                 })
    //         );

    //         const stubs = _factoryModules.map(({ construct, directory }) => ({
    //             init: _sinon.stub(construct, 'init'),
    //             directory,
    //         }));

    //         const props = {
    //             foo: _testValues.getString('foo'),
    //         };

    //         await builder.build(scope, props);

    //         stubs.forEach((stubs, index) => {
    //             const { init } = stubs;

    //             expect(init).to.not.have.been.called;
    //         });
    //     });

    //     it('should reject the promise if any of the init methods fails', async () => {
    //         const builder = _createInstance();
    //         const scope = _createScope();
    //         const error = new Error('something went wrong!');
    //         _factoryModules = _createFactoryModules(10);

    //         const failIndex = Math.floor(Math.random() * 10);

    //         _factoryModules.map(({ construct, directory }, index) => {
    //             const init = _sinon.stub(construct, 'init');
    //             if (index === failIndex) {
    //                 init.resolves();
    //             } else {
    //                 init.rejects(error);
    //             }
    //             return {
    //                 init,
    //                 directory,
    //             };
    //         });

    //         const ret = builder.build(scope);

    //         await expect(ret).to.be.rejectedWith(error);
    //     });

    //     it('should resolve the promise if all of the init methods succeed', async () => {
    //         const builder = _createInstance();
    //         const scope = _createScope();
    //         _factoryModules = _createFactoryModules(10);

    //         const ret = builder.build(scope);

    //         await expect(ret).to.be.fulfilled;
    //     });
    // });
});
