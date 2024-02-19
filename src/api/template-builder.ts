import { argValidator as _argValidator } from '@vamship/arg-utils';

import IStatementOptions from './statement-options.js';

/**
 * A mapping from input sources to the actual source in the template mapping.
 */
const SOURCE_MAP = {
    body: 'path',
    params: 'params',
    querystring: 'params',
    header: 'params',
    url: 'params',
    object: 'json',
};

/**
 * Builder class that can be used to construct request/response templates.
 */
export default class TemplateBuilder {
    private _statements: string[];

    /**
     */
    constructor() {
        this._statements = [];
    }

    /**
     * Maps a property from the request payload.
     *
     * @param sourceProp The name of the source property.
     * @param destProp The name of the destination property. This will default
     *        to the source prop value if omitted.
     * @param defaultValue An optional default value to apply to the property.
     *
     * @return A reference to the current object - can be used to chain multiple
     *         calls.
     */
    public mapFromBody(
        sourceProp: string,
        destProp: string = sourceProp,
        defaultValue?: unknown,
    ): TemplateBuilder {
        _argValidator.checkString(sourceProp, 1, 'Invalid sourceProp (arg #1)');
        _argValidator.checkString(destProp, 1, 'Invalid destProp (arg #2)');

        const options: IStatementOptions = {
            noQuotes: true,
            noComma: this._statements.length === 0,
            escapeNewLine: false,
            defaultValue,
        };

        this._addStatement('object', `$.${sourceProp}`, destProp, options);
        return this;
    }

    /**
     * Maps a string property from the request url.
     *
     * @param sourceProp The name of the source property.
     * @param destProp The name of the destination property. This will default
     *        to the source prop value if omitted.
     * @param defaultValue An optional default value to apply to the property.
     *
     * @return A reference to the current object - can be used to chain multiple
     *         calls.
     */
    public mapStringFromUrl(
        sourceProp: string,
        destProp: string = sourceProp,
        defaultValue?: unknown,
    ): TemplateBuilder {
        _argValidator.checkString(sourceProp, 1, 'Invalid sourceProp (arg #1)');
        _argValidator.checkString(destProp, 1, 'Invalid destProp (arg #2)');

        const options: IStatementOptions = {
            noQuotes: false,
            noComma: this._statements.length === 0,
            escapeNewLine: false,
            defaultValue,
        };

        this._addStatement('url', sourceProp, destProp, options);
        return this;
    }

    /**
     * Maps a number property from the request url.
     *
     * @param sourceProp The name of the source property.
     * @param destProp The name of the destination property. This will default
     *        to the source prop value if omitted.
     * @param defaultValue An optional default value to apply to the property.
     *
     * @return A reference to the current object - can be used to chain multiple
     *         calls.
     */
    public mapNumberFromUrl(
        sourceProp: string,
        destProp: string = sourceProp,
        defaultValue?: unknown,
    ): TemplateBuilder {
        _argValidator.checkString(sourceProp, 1, 'Invalid sourceProp (arg #1)');
        _argValidator.checkString(destProp, 1, 'Invalid destProp (arg #2)');

        const options: IStatementOptions = {
            noQuotes: true,
            noComma: this._statements.length === 0,
            escapeNewLine: false,
            defaultValue,
        };

        this._addStatement('url', sourceProp, destProp, options);
        return this;
    }

    /**
     * Generates a set of mapping statements that map properties from a JWT
     * token into a user object in the request. This assumes that the header
     * value contains a valid JWT token. Requests to the server can be
     * malformed if this assumption is not valid.
     *
     * @param props A hash containing a map of user fields to fields
     *        in the JWT token. The key of the hash represents the name of a
     *        field in the user object. The value describes the destination
     *        field name, and addiitional attributes that determine how the
     *        value will be mapped.
     * @param fieldName The name of the request field  that contains the JWT
     *        token. This will default to "Authorization" if omitted.
     * @param destProp The name of the destination property. This will default
     *        to '_user' if omitted.
     *
     * @return A reference to the current object - can be used to chain multiple
     *         calls.
     */
    public mapUserFromJwt(
        props: {
            [sourceProp: string]: {
                destProp: string;
                options?: IStatementOptions;
            };
        },
        fieldName = 'Authorization',
        destProp = '_user',
    ): TemplateBuilder {
        _argValidator.checkObject(props, 'Invalid props (arg #1)');
        _argValidator.checkString('fieldName', 1, 'Invalid fieldName (arg #2)');
        _argValidator.checkString('destProp', 1, 'Invalid destProp (arg #3)');

        const comma = this._statements.length === 0 ? '' : ',';
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const rawTokenVar = `$jwt_${randomSuffix}`;
        const decodedTokenVar = `$decoded_${randomSuffix}`;
        const tokenJsonVar = `$json_${randomSuffix}`;

        const defaultOptions = { noQuotes: false };
        const mappingStatements = Object.keys(props)
            .map((sourceProp) => {
                const { destProp, options } = props[sourceProp];
                const { noQuotes } = {
                    ...defaultOptions,
                    ...options,
                };
                const quotes = noQuotes ? '' : '"';

                return `\n  "${sourceProp}": ${quotes}${tokenJsonVar}['${destProp}']${quotes}`;
            })
            .join(',');

        const statement = `#set(${rawTokenVar} = $input.params('${fieldName}').split('\\.'))
#if(${rawTokenVar}.size() > 2)
#set(${decodedTokenVar} = $util.base64Decode(${rawTokenVar}[1]))
#set(${tokenJsonVar} = $util.parseJson(${decodedTokenVar}))
    ${comma}"${destProp}": {${mappingStatements}
    }
#end`;

        this._statements.push(statement);
        return this;
    }

    /**
     * Maps a literal value to the destination payload.
     *
     * @param destProp The name of the destination property.
     * @param value The literal value to be mapped.
     * @param options A set of options to use when performing the mapping.
     *
     * @return A reference to the current object - can be used to chain multiple
     *         calls.
     */
    public mapLiteral(
        destProp: string,
        value:
            | string
            | number
            | boolean
            | Record<string, unknown>
            | Array<unknown>,
    ): TemplateBuilder {
        _argValidator.checkString(destProp, 1, 'Invalid destProp (arg #1)');

        let quote = '"';
        if (typeof value !== 'string') {
            quote = '';
            value = JSON.stringify(value);
        }
        const comma = this._statements.length === 0 ? '' : ',';

        const statement = `  ${comma}"${destProp}": ${quote}${value}${quote}`;

        this._statements.push(statement);
        return this;
    }

    /**
     * Maps a property from source to destination. This call requires that the
     * mapping options be specified completely.
     *
     * @param source The source of the input property.
     * @param sourceProp The name of the source property.
     * @param destProp The name of the destination property.
     * @param options A set of options to use when performing the mapping.
     *
     * @return A reference to the current object - can be used to chain multiple
     *         calls.
     */
    public mapProperty(
        source: string,
        sourceProp: string,
        destProp: string,
        options: IStatementOptions,
    ): TemplateBuilder {
        _argValidator.checkString(sourceProp, 1, 'Invalid source (arg #1)');
        _argValidator.checkString(sourceProp, 1, 'Invalid sourceProp (arg #2)');
        _argValidator.checkString(destProp, 1, 'Invalid destProp (arg #3)');
        _argValidator.checkObject(options, 'Invalid options (arg #4)');

        this._addStatement(source, sourceProp, destProp, options);
        return this;
    }

    /**
     * Generates the final template string based on the added statements.
     *
     * @return An Apache Velocity template mapping string.
     */
    public build(): string {
        return ['{'].concat(this._statements).concat(['}']).join('\n');
    }

    /**
     * Adds a mapping statement to the builder. This is a single Apache Velocity
     * template mapping statement that maps a property from the source to the
     * destination.
     *
     * @private
     *
     * @param source The source from which to read data. This can be one of -
     *        body, params, querystring, header, url or object.
     * @param sourceProp Name of the source property to map.
     * @param destProp Name of the destination property to map the source to
     * @param options An optional options object that governs how the mapping
     *        statement is generated.
     */
    private _addStatement(
        source: string,
        sourceProp: string,
        destProp: string,
        options?: IStatementOptions,
    ): void {
        const key = source as keyof typeof SOURCE_MAP;
        const mappedSource = SOURCE_MAP[key];
        _argValidator.checkString(mappedSource, 1, 'Invalid source (arg #1)');
        _argValidator.checkString(sourceProp, 1, 'Invalid sourceProp (arg #2)');
        _argValidator.checkString(destProp, 1, 'Invalid destProp (arg #3)');

        options = Object.assign(
            {
                noQuotes: false,
                noComma: false,
                escapeNewLine: false,
                defaultValue: undefined,
            },
            options,
        );

        const { noQuotes, noComma, escapeNewLine, defaultValue } = options;

        const quote = noQuotes ? '' : '"';
        const comma = noComma ? '' : ',';
        const sourcePropTransform = escapeNewLine
            ? ".replaceAll('\\n', '\\\\n')"
            : '';

        const checkSourceExpression =
            mappedSource === 'json'
                ? `$input.path('${sourceProp}')`
                : `$input.${mappedSource}('${sourceProp}')`;

        const assignSourceExpression = `$input.${mappedSource}('${sourceProp}')`;

        const template = [
            `#if(${checkSourceExpression} != "")`,
            `  ${comma}"${destProp}": ${quote}${assignSourceExpression}${sourcePropTransform}${quote}`,
            '#else',
        ];

        if (typeof defaultValue !== 'undefined') {
            const value =
                typeof defaultValue === 'string'
                    ? defaultValue
                    : JSON.stringify(defaultValue);

            template.push(
                `  ${comma}"${destProp}": ${quote}${value}${sourcePropTransform}${quote}`,
            );
        } else {
            template.push(`  ${comma}"${destProp}": null`);
        }
        template.push('#end');

        this._statements.push(template.join('\n'));
    }
}
