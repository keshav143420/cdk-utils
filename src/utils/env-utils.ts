/**
 * Module that includes utility functions for environment variables.
 */
const envUtils = {
    /**
     * Reads an environment variable, and validates that it is non empty.
     *
     * @private
     * @param envVar The name of the environment variable to obtain the value from.
     */
    getString: function (envVar: string, defaultValue?: string): string {
        const hasDefault = typeof defaultValue === 'string';
        const value = process.env[envVar];
        if (!value) {
            if (!hasDefault) {
                throw new Error(
                    `Cannot build stack. Environment variable not set: ${envVar}`,
                );
            }
            return defaultValue as string;
        }
        return value;
    },

    /**
     * Reads an environment variable, converts it into a number and returns it.
     * Errors will be thrown if the variable is not defined, or is not a valid
     * number.
     *
     * @private
     * @param envVar The name of the environment variable to obtain the value
     *        from.
     * @param defaultValue The default value to return if the environment
     *        variable has not been set, or is not a valid number.
     */
    getNumber: function (envVar: string, defaultValue?: number): number {
        const hasDefault = typeof defaultValue === 'number';

        const value = parseInt(
            envUtils.getString(envVar, hasDefault ? '' : undefined),
        );
        if (isNaN(value)) {
            if (!hasDefault) {
                throw new Error(
                    `Environment variable is not a number: ${envVar}`,
                );
            }
            return defaultValue as number;
        }
        return value;
    },
};

export default envUtils;
