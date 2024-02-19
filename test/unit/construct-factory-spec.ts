import 'mocha';
import _chai, { expect } from 'chai';
import _sinon from 'sinon';
import _sinonChai from 'sinon-chai';
import _chaiAsPromised from 'chai-as-promised';

_chai.use(_sinonChai);
_chai.use(_chaiAsPromised);

import { Construct } from 'constructs';
import { Stack, App } from 'aws-cdk-lib';
import { testValues as _testValues } from '@vamship/test-utils';
import bluebird from 'bluebird';

import ConstructFactory from '../../src/construct-factory.js';
import IConstructProps from '../../src/construct-props.js';

const { Promise } = bluebird;

describe('ConstructFactory', () => {
    class MockConstructFactory extends ConstructFactory<Construct> {
        private _initResolve?: (construct: Construct) => void;
        private _initReject?: (error: Error | string) => void;

        protected async _init(
            scope: Stack,
            props: IConstructProps,
        ): Promise<Construct> {
            const construct = await new Promise<Construct>(
                (resolve, reject) => {
                    this._initResolve = resolve;
                    this._initReject = reject;
                },
            );
            return construct as Construct;
        }

        public resolveInit(construct: Construct): void {
            if (typeof this._initResolve !== 'undefined') {
                this._initResolve(construct as Construct);
            } else {
                throw new Error('Construct not initialized');
            }
        }

        public rejectInit(error: Error | string): void {
            if (typeof this._initReject !== 'undefined') {
                this._initReject(error);
            } else {
                throw new Error('Construct not initialized');
            }
        }
    }

    class MockConstruct extends Construct {
        constructor(id: string) {
            super(new App(), id);
        }
    }

    function _createInstance(
        id = _testValues.getString('id'),
    ): MockConstructFactory {
        return new MockConstructFactory(id);
    }

    function _createScope(
        stackName = _testValues.getString('stackName'),
    ): Stack {
        return {
            stackName,
            toString: () => stackName,
        } as Stack;
    }

    function _createProps(): IConstructProps {
        return {} as IConstructProps;
    }

    describe('ctor()', () => {
        it('should throw an error if invoked without a valid id', () => {
            const inputs = _testValues.allButString('');
            const error = 'Invalid id (arg #1)';

            inputs.forEach((id: _testValues.AnyInput) => {
                const wrapper = (): MockConstructFactory =>
                    new MockConstructFactory(id as string);

                expect(wrapper).to.throw(error);
            });
        });

        it('should return an object with the expected methods and properties', () => {
            const id = _testValues.getString('id');
            const factory = new MockConstructFactory(id);

            expect(factory).to.be.an('object');

            // Public methods
            expect(factory.id).to.equal(id);
            expect(factory.init).to.be.a('function');
            expect(factory.getConstruct).to.be.a('function');
        });
    });

    describe('init()', () => {
        it('should throw an error if invoked without a valid scope', async () => {
            const inputs = _testValues.allButObject();
            const error = 'Invalid scope (arg #1)';

            const result = Promise.map(inputs, (scope) => {
                const factory = _createInstance();
                const props = _createProps();
                // @ts-ignore
                const ret = factory.init(scope, props);
                return expect(ret).to.be.rejectedWith(error);
            });

            await expect(result).to.have.been.fulfilled;
        });

        it('should throw an error if invoked without valid props', async () => {
            const inputs: _testValues.AnyInputList = _testValues.allButObject();
            const error = 'Invalid props (arg #2)';

            const result = Promise.map(
                inputs,
                (props: _testValues.AnyInput) => {
                    const factory = _createInstance();
                    const scope = _createScope();
                    // @ts-ignore
                    const ret = factory.init(scope, props);
                    return expect(ret).to.be.rejectedWith(error);
                },
            );

            await expect(result).to.have.been.fulfilled;
        });

        it('should throw an error if a construct for the specific scope has already been created', async () => {
            const stackName = 'my_stack_1';

            const factory = _createInstance();
            const scope = _createScope(stackName);
            const error = `Construct has already been initialized for scope [${stackName}]`;

            const props = _createProps();

            const firstInit = factory.init(scope, props);
            factory.resolveInit({} as Construct);
            await firstInit;

            const ret = factory.init(scope, props);

            await expect(ret).to.be.rejectedWith(error);
        });

        it('should invoke the protected init method to create a new instance', () => {
            const id = _testValues.getString('id');
            const stackName = 'my_stack_1';
            const scope = _createScope(stackName);
            const props = _createProps();

            const factory = _createInstance(id);
            const methodName = '_init' as keyof MockConstructFactory;
            const initMock = _sinon.stub(factory, methodName);

            expect(initMock).to.not.have.been.called;

            factory.init(scope, props);

            expect(initMock).to.have.been.calledOnce;
            expect(initMock).to.have.been.calledWithExactly(scope, props);
        });

        it('should throw an error if the protected init method throws an error', async () => {
            const id = _testValues.getString('id');
            const stackName = 'my_stack_1';
            const scope = _createScope(stackName);
            const props = _createProps();
            const error = 'something went wrong!';

            const factory = _createInstance(id);
            const instance = factory.getConstruct(scope);

            const ret = factory.init(scope, props);
            factory.rejectInit(error);

            await expect(ret).to.be.rejectedWith(error);
            await expect(instance).to.be.rejectedWith(error);
        });

        it('should resolve the promise if the protected init method resolves', async () => {
            const id = _testValues.getString('id');
            const stackName = 'my_stack_1';
            const scope = _createScope(stackName);
            const props = _createProps();
            const expectedConstruct = new MockConstruct('foo');

            const factory = _createInstance(id);
            const instance = factory.getConstruct(scope);

            const ret = factory.init(scope, props);
            factory.resolveInit(expectedConstruct);

            await expect(ret).to.be.fulfilled;
            await expect(instance).to.be.fulfilled.then((data) => {
                expect(data).to.equal(expectedConstruct);
            });
        });
    });

    describe('getConstruct()', () => {
        it('should throw an error if invoked without a valid scope', async () => {
            const inputs = _testValues.allButObject();
            const error = 'Invalid scope (arg #1)';

            const result = Promise.map(inputs, (scope) => {
                const factory = _createInstance();
                // @ts-ignore
                const ret = factory.getConstruct(scope);
                return expect(ret).to.be.rejectedWith(error);
            });

            return expect(result).to.have.been.fulfilled;
        });

        it('should return a reference to the construct after the init promise has been resolved', async () => {
            const stackName = 'my_stack_1';
            const scope = _createScope(stackName);
            const expectedConstruct = new MockConstruct('foo');

            const factory = _createInstance();

            factory.init(scope, _createProps());

            const ret = factory.getConstruct(scope);

            expect(ret).to.not.equal(expectedConstruct);

            factory.resolveInit(expectedConstruct);
            const construct = await ret;

            expect(construct).to.equal(expectedConstruct);
        });
    });
});
