import { asyncHelper as _asyncHelper } from '@vamship/test-utils';

/**
 * A mapping of step names to the step number.
 */
export interface ISteps {
    /**
     * The name/number mapping.
     */
    [key: string]: number;
}

/**
 * Utility class that can be used to step through execution of a method during
 * testing. Useful when testing async functions that chain several async steps
 * together.
 */
export default class MethodController {
    private _resolver: (step: number) => IterableIterator<unknown>;
    private _steps: { [key: string]: number };

    /**
     * @param steps An enumeration of execution steps. These steps can
     *        be used to identify the step to run until by using a friendly step
     *        name instead of a numerical index. For ease of use, these steps
     *        will be exposed as properties of the instance, so take care to
     *        ensure that the step name does not conflict with existing
     *        properties.
     * @param resolver A generator function that can be used to
     *        step through the method under test. This function must yield at
     *        each step, allowing tests to be executed at that point.
     */
    constructor(
        steps: ISteps,
        resolver: (step: number) => IterableIterator<unknown>,
    ) {
        // Object.keys(steps).forEach(function (key) {
        //     // const stepKey = key as keyof MethodController;
        //     this[key] = steps[key];
        // });
        this._resolver = resolver;
        this._steps = steps;
    }

    /**
     * Returns a list of steps available to the controller.
     */
    public get steps(): ISteps {
        return this._steps;
    }

    /**
     * Steps execution forward until the specified step. Will execute actions,
     * chaining them togehter until the specified step is reached. A promise
     * that represents the completion of the final step is returned.
     *
     * @param step The index of the step to execute until.
     * @param iteration An optional iteration value that is indicative of the
     *        test iteration, when the same function is invoked multiple times
     *        within a single test case.
     *
     * @return A promise that represents execution until the specified
     *         step.
     */
    public async resolveUntil(step: number, iteration = 0): Promise<unknown> {
        let index = 0;
        let result = { value: undefined, done: false } as IteratorResult<
            unknown,
            unknown
        >;
        const iterator = this._resolver(iteration);

        while (index < step && !result.done) {
            result = iterator.next();
            await _asyncHelper.wait(1);
            index++;
        }

        return result.value;
    }
}

module.exports = MethodController;
