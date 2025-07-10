import 'mocha';
import path from 'node:path';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(sinonChai);
chai.use(chaiAsPromised);

import { testValues } from '@vamship/test-utils';

import DirInfo from '../../dist/dir-info.js'; // Updated path
const SEP = path.sep;

describe('DirInfo', () => {
    function _createInstance(filePath = testValues.getString('path')): DirInfo { // param renamed
        return new DirInfo(filePath);
    }

    describe('ctor()', () => {
        it('should throw an error if invoked without a valid path', () => {
            const input = testValues.allButString('');
            const error = 'Invalid path (arg #1)'; // Error message from DirInfo refers to 'path'

            input.forEach((filePath) => { // param renamed
                const wrapper = (): DirInfo => new DirInfo(filePath);

                expect(wrapper).to.throw(error);
            });
        });

        it('should return an object with expected methods and properties', () => {
            const filePath = testValues.getString('path'); // var renamed

            const dirInfo = new DirInfo(filePath);

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
            const filePath = testValues.getString('path');
            const expectedName = filePath;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.name).to.equal(expectedName);
        });

        it('should return the the last token if the path contained more than one token', () => {
            const filePath = `foo${SEP}bar${SEP}target`;
            const expectedName = 'target';

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.name).to.equal(expectedName);
        });

        it('should use the normalized path to determine the name', () => {
            const filePath = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedName = 'target';

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.name).to.equal(expectedName);
        });
    });

    describe('[path]', () => {
        it('should return the input path if the input path has already been normalized', () => {
            const filePath = `foo${SEP}bar${SEP}target`;
            const expectedPath = filePath;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.path).to.equal(expectedPath);
        });

        it('should return the normalized path if the input path has not been normalized', () => {
            const filePath = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `foo${SEP}target`;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.path).to.equal(expectedPath);
        });

        it('should return an absolute path if the input path is an absolute path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}target`;
            const expectedPath = filePath;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.path).to.equal(expectedPath);
        });

        it('should return an absolute normalized path if the input path is an absolute non normalized path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `${SEP}foo${SEP}target`;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.path).to.equal(expectedPath);
        });
    });

    describe('[absPath]', () => {
        it('should return the absolute path of the directory if the input is an absolute path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}target`;
            const expectedPath = filePath;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });

        it('should resolve the path to an absolute path if the input is a realtive path', () => {
            const filePath = `foo${SEP}bar${SEP}target`;
            const expectedPath = path.resolve(filePath);

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is an absolute but non normalized path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `${SEP}foo${SEP}target`;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is a relative but non normalized path', () => {
            const filePath = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = path.resolve(`foo${SEP}target`);

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.absPath).to.equal(expectedPath);
        });
    });

    describe('[parentPath]', () => {
        it('should return the absolute parent path if the input is an absolute path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}target`;
            const expectedPath = `${SEP}foo${SEP}bar`;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });

        it('should resolve the path to an absolute path if the input is a realtive path', () => {
            const filePath = `foo${SEP}bar${SEP}target`;
            const expectedPath = path.resolve(`foo${SEP}bar`);

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is an absolute but non normalized path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = `${SEP}foo`;

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });

        it('should return a normalized path if the input is a relative but non normalized path', () => {
            const filePath = `foo${SEP}bar${SEP}..${SEP}target${SEP}chaz${SEP}..`;
            const expectedPath = path.resolve('foo');

            const dirInfo = _createInstance(filePath);
            expect(dirInfo.parentPath).to.equal(expectedPath);
        });
    });

    describe('getApiRoutePath()', () => {
        it('should throw an error if invoked without a valid basePath', () => {
            const input = testValues.allButString('');
            const error = 'Invalid basePath (arg #1)';

            input.forEach((basePath) => {
                const dirInfo = _createInstance();
                const wrapper = (): string => dirInfo.getApiRoutePath(basePath);

                expect(wrapper).to.throw(error);
            });
        });

        it('should throw an error if the base path is longer than the directory path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}baz${SEP}target`;
            const basePath = `${SEP}foo${SEP}bar${SEP}baz${SEP}target${SEP}chaz`;

            const dirInfo = _createInstance(filePath);
            const error = 'Base has more levels than the directory path';

            const wrapper = (): string => dirInfo.getApiRoutePath(basePath);

            expect(wrapper).to.throw(error);
        });

        it('should throw an error if the base path does not completely exist in the directory path', () => {
            const filePath = `${SEP}foo${SEP}bar${SEP}baz${SEP}target`;
            const basePath = `${SEP}foo${SEP}bar${SEP}chaz${SEP}target`;

            const dirInfo = _createInstance(filePath);
            const error = 'Base path does not exist in directory path';

            const wrapper = (): string => dirInfo.getApiRoutePath(basePath);

            expect(wrapper).to.throw(error);
        });

        it('should return the portion of the path that does not include the base path', () => {
            const filePath = `${SEP}ignore${SEP}this${SEP}myapi${SEP}foo${SEP}target`;
            const basePath = `${SEP}ignore${SEP}this`;
            const dirInfo = _createInstance(filePath);

            const expectedPath = `${SEP}myapi${SEP}foo${SEP}target`;

            const routePath = dirInfo.getApiRoutePath(basePath);
            expect(routePath).to.equal(expectedPath);
        });

        it('should resolve the base path if the base path was not an absolute path', () => {
            const pathValue = path.resolve(
                `ignore${SEP}this${SEP}myapi${SEP}foo${SEP}target`
            );
            const basePath = `ignore${SEP}this`;
            const dirInfo = _createInstance(path);

            const expectedPath = `${SEP}myapi${SEP}foo${SEP}target`;

            const routePath = dirInfo.getApiRoutePath(basePath);
            expect(routePath).to.equal(expectedPath);
        });

        it('should normalize the base path if the base path was not normalized', () => {
            const pathValue = path.resolve(
                `ignore${SEP}this${SEP}myapi${SEP}foo${SEP}target`
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
            const input = testValues.allButString();
            const error = 'Invalid name (arg #1)';

            input.forEach((name) => {
                const dirInfo = _createInstance();
                const wrapper = (): DirInfo => dirInfo.createChild(name);

                expect(wrapper).to.throw(error);
            });
        });

        it('should create and return a new child object', () => {
            const name = testValues.getString('child');
            const dirInfo = _createInstance();

            const child = dirInfo.createChild(name);
            expect(child).to.be.an.instanceof(DirInfo);
        });

        it('should initialize the child with correct parameters', () => {
            const name = testValues.getString('child');
            const dirInfo = _createInstance();

            const child = dirInfo.createChild(name);
            expect(child.name).to.equal(name);
            expect(child.path).to.equal(path.join(dirInfo.path, name));
        });
    });
});
