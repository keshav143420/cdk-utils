import 'mocha';
import _path from 'path';
import _chai, { expect } from 'chai';
import _sinonChai from 'sinon-chai';
import _chaiAsPromised from 'chai-as-promised';

_chai.use(_sinonChai);
_chai.use(_chaiAsPromised);

import { testValues as _testValues } from '@vamship/test-utils';

import DirInfo from '../../src/dir-info.js';
const SEP = _path.sep;

describe('DirInfo', () => {
    function _createInstance(path = _testValues.getString('path')): DirInfo {
        return new DirInfo(path);
    }

    describe('ctor()', () => {
        it('should throw an error if invoked without a valid path', () => {
            const input = _testValues.allButString('');
            const error = 'Invalid path (arg #1)';

            input.forEach((path) => {
                const wrapper = (): DirInfo => new DirInfo(path as string);

                expect(wrapper).to.throw(error);
            });
        });

        it('should return an object with expected methods and properties', () => {
            const path = _testValues.getString('path');

            const dirInfo = new DirInfo(path);

            expect(dirInfo).to.be.an('object');
            expect(dirInfo.name).to.be.a('string');
            expect(dirInfo.parentPath).to.be.a('string');
            expect(dirInfo.path).to.be.a('string');
            expect(dirInfo.absPath).to.be.a('string');
            expect(dirInfo.getApiRoutePath).to.be.a('function');
            expect(dirInfo.createChild).to.be.a('function');
        });
    });

    describe('[name]', () => {
        it('should return the input path if the path contained only one token', () => {
            const path = _testValues.getString('path');
            const expectedName = path;

            const dirInfo = _createInstance(path);
            expect(dirInfo.name).to.equal(expectedName);
        });

        it('should return the the last token if the path contained more than one token', () => {
            const path = `foo${SEP}bar${SEP}target`;
            const expectedName = 'target';

            const dirInfo = _createInstance(path);
            expect(dirInfo.name).to.equal(expectedName);
        });

        it('should use the normalized path to determine the name', () => {
            const path = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedName = 'target';

            const dirInfo = _createInstance(path);
            expect(dirInfo.name).to.equal(expectedName);
        });
    });

    describe('[path]', () => {
        it('should return the input path if the input path has already been normalized', () => {
            const path = `foo${SEP}bar${SEP}target`;
            const expectedPath = path;

            const dirInfo = _createInstance(path);
            expect(dirInfo.path).to.equal(expectedPath);
        });

        it('should return the normalized path if the input path has not been normalized', () => {
            const path = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `foo${SEP}target`;

            const dirInfo = _createInstance(path);
            expect(dirInfo.path).to.equal(expectedPath);
        });

        it('should return an absolute path if the input path is an absolute path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}target`;
            const expectedPath = path;

            const dirInfo = _createInstance(path);
            expect(dirInfo.path).to.equal(expectedPath);
        });

        it('should return an absolute normalized path if the input path is an absolute non normalized path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `${SEP}foo${SEP}target`;

            const dirInfo = _createInstance(path);
            expect(dirInfo.path).to.equal(expectedPath);
        });
    });

    describe('[absPath]', () => {
        it('should return the absolute path of the directory if the input is an absolute path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}target`;
            const expectedPath = path;

            const dirInfo = _createInstance(path);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });

        it('should resolve the path to an absolute path if the input is a realtive path', () => {
            const path = `foo${SEP}bar${SEP}target`;
            const expectedPath = _path.resolve(path);

            const dirInfo = _createInstance(path);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is an absolute but non normalized path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `${SEP}foo${SEP}target`;

            const dirInfo = _createInstance(path);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is a relative but non normalized path', () => {
            const path = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = _path.resolve(`foo${SEP}target`);

            const dirInfo = _createInstance(path);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });
    });

    describe('[parentPath]', () => {
        it('should return the absolute parent path if the input is an absolute path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}target`;
            const expectedPath = `${SEP}foo${SEP}bar`;

            const dirInfo = _createInstance(path);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });

        it('should resolve the path to an absolute path if the input is a realtive path', () => {
            const path = `foo${SEP}bar${SEP}target`;
            const expectedPath = _path.resolve(`foo${SEP}bar`);

            const dirInfo = _createInstance(path);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is an absolute but non normalized path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `${SEP}foo`;

            const dirInfo = _createInstance(path);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is a relative but non normalized path', () => {
            const path = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = _path.resolve('foo');

            const dirInfo = _createInstance(path);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });
    });

    describe('getApiRoutePath()', () => {
        it('should throw an error if invoked without a valid basePath', () => {
            const input = _testValues.allButString('');
            const error = 'Invalid basePath (arg #1)';

            input.forEach((basePath) => {
                const dirInfo = _createInstance();
                const wrapper = (): string =>
                    dirInfo.getApiRoutePath(basePath as string);

                expect(wrapper).to.throw(error);
            });
        });

        it('should throw an error if the base path is longer than the directory path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}baz${SEP}target`;
            const basePath = `${SEP}foo${SEP}bar${SEP}baz${SEP}target${SEP}chaz`;

            const dirInfo = _createInstance(path);
            const error = 'Base has more levels than the directory path';

            const wrapper = (): string => dirInfo.getApiRoutePath(basePath);

            expect(wrapper).to.throw(error);
        });

        it('should throw an error if the base path does not completely exist in the directory path', () => {
            const path = `${SEP}foo${SEP}bar${SEP}baz${SEP}target`;
            const basePath = `${SEP}foo${SEP}bar${SEP}chaz${SEP}target`;

            const dirInfo = _createInstance(path);
            const error = 'Base path does not exist in directory path';

            const wrapper = (): string => dirInfo.getApiRoutePath(basePath);

            expect(wrapper).to.throw(error);
        });

        it('should return the portion of the path that does not include the base path', () => {
            const path = `${SEP}ignore${SEP}this${SEP}myapi${SEP}foo${SEP}target`;
            const basePath = `${SEP}ignore${SEP}this`;
            const dirInfo = _createInstance(path);

            const expectedPath = `${SEP}myapi${SEP}foo${SEP}target`;

            const routePath = dirInfo.getApiRoutePath(basePath);
            expect(routePath).to.equal(expectedPath);
        });

        it('should resolve the base path if the base path was not an absolute path', () => {
            const path = _path.resolve(
                `ignore${SEP}this${SEP}myapi${SEP}foo${SEP}target`,
            );
            const basePath = `ignore${SEP}this`;
            const dirInfo = _createInstance(path);

            const expectedPath = `${SEP}myapi${SEP}foo${SEP}target`;

            const routePath = dirInfo.getApiRoutePath(basePath);
            expect(routePath).to.equal(expectedPath);
        });

        it('should normalize the base path if the base path was not normalized', () => {
            const path = _path.resolve(
                `ignore${SEP}this${SEP}myapi${SEP}foo${SEP}target`,
            );
            const basePath = `ignore${SEP}this${SEP}foo${SEP}..`;
            const dirInfo = _createInstance(path);

            const expectedPath = `${SEP}myapi${SEP}foo${SEP}target`;

            const routePath = dirInfo.getApiRoutePath(basePath);
            expect(routePath).to.equal(expectedPath);
        });
    });

    describe('createChild()', () => {
        it('should throw an error if invoked without a valid name', () => {
            const input = _testValues.allButString();
            const error = 'Invalid name (arg #1)';

            input.forEach((name: any) => {
                const dirInfo = _createInstance();
                const wrapper = (): DirInfo => dirInfo.createChild(name);

                expect(wrapper).to.throw(error);
            });
        });

        it('should create and return a new child object', () => {
            const name = _testValues.getString('child');
            const dirInfo = _createInstance();

            const child = dirInfo.createChild(name);
            expect(child).to.be.an.instanceof(DirInfo);
        });

        it('should initialize the child with correct parameters', () => {
            const name = _testValues.getString('child');
            const dirInfo = _createInstance();

            const child = dirInfo.createChild(name);
            expect(child.name).to.equal(name);
            expect(child.path).to.equal(_path.join(dirInfo.path, name));
        });
    });
});
