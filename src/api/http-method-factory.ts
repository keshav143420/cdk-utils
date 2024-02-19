import _path from 'path';
import _crypto from 'crypto';

import {
    AuthorizationType,
    AwsIntegration,
    IAuthorizer,
    IModel,
    Integration,
    IntegrationOptions,
    IntegrationResponse,
    LambdaIntegration,
    LambdaIntegrationOptions,
    Method,
    MethodOptions,
    MethodResponse,
    MockIntegration,
    Model,
    PassthroughBehavior,
    RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Role } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Arn, ArnFormat, Stack } from 'aws-cdk-lib';
import { argValidator as _argValidator } from '@vamship/arg-utils';
import bluebird from 'bluebird';

import ConstructFactory from '../construct-factory.js';
import IConstructProps from '../construct-props.js';
import IHttpMethodFactoryOptions from './http-method-factory-options.js';
import IRequestParams from './request-params.js';
import { Boolean } from '../../node_modules/aws-sdk/clients/cloudtrail.js';

const { Promise } = bluebird;

interface Params {
    header: Record<string, any>;
    path: Record<string, boolean>;
    querystring: Record<string, any>;
}

const RESPONSE_TEMPLATE_ERROR = {
    'application/json': `{
    "message": "$util.escapeJavaScript($input.path('$.errorMessage'))"
}`,
};

const RESPONSE_TEMPLATE_EMPTY = {
    'application/json': '',
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': "'*'",
};

const CORS_PREFLIGHT_HEADERS = {
    'Access-Control-Allow-Headers':
        "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Content-Length'",
    'Access-Control-Allow-Origin': "'*'",
    'Access-Control-Allow-Credentials': "'true'",
    'Access-Control-Allow-Methods': "'GET,PUT,POST,DELETE'",
    'Access-Control-Max-Age': "'86400'",
};

export default class HttpMethodFactory extends ConstructFactory<Method> {
    private _fileName: string;
    private _responseHeaders: { [header: string]: string };

    /**
     * @param filePath The full path to the file in which the construct is
     *        defined.
     * @param options Options that govern the default behavior of the http
     *        method.
     */
    constructor(
        filePath: string,
        options: IHttpMethodFactoryOptions = {
            enableCors: true,
        },
    ) {
        _argValidator.checkString(filePath, 1, 'Invalid filePath (arg #1)');

        // NOTE: The id that we passing the absolute file path as the id
        // of the construct. This is not the greatest idea, because it ties
        // the CDK script to the path on a local laptop.
        // We are mitigating this issue by ignoring this id, and using the
        // relative path to the method in the _init() method.
        const id = `id${_crypto
            .createHash('md5')
            .update(filePath)
            .digest('hex')}`;
        super(id);

        this._fileName = filePath;

        const headers = !options.enableCors
            ? {}
            : this.httpMethod === 'OPTIONS'
            ? CORS_PREFLIGHT_HEADERS
            : CORS_HEADERS;
        this._responseHeaders = Object.assign({}, headers);
    }

    /**
     * @override
     */
    protected async _init(
        scope: Stack,
        props: IConstructProps,
    ): Promise<Method> {
        const apiFactory = props.apiFactory as ConstructFactory<RestApi>;
        const apiRootDir = props.apiRootDir as string;

        const restApi = await apiFactory.getConstruct(scope);
        const requestPath = this.getRequestPath(apiRootDir);

        // NOTE: We're overriding the id using the relative path of the method,
        // and the http verb.
        const idString = `${this.httpMethod}:${requestPath}`;
        const id = `id${_crypto
            .createHash('md5')
            .update(idString)
            .digest('hex')}`;

        const method = new Method(scope, id, {
            httpMethod: this.httpMethod,
            integration: await this.buildIntegration(scope),
            options: await this.buildMethodOptions(scope, requestPath),
            resource: restApi.root.resourceForPath(requestPath),
        });

        return method;
    }

    /**
     * Returns the full path at which the file containing the construct exists.
     */
    protected get filePath(): string {
        return this._fileName;
    }

    /**
     * Returns the http verb for this method. The default implementation uses
     * the name of the file for the class to determine the verb.
     *
     * This property can be overridden by child classes.
     */
    protected get httpMethod(): string {
        const { base } = _path.parse(this.filePath);
        return base.replace(/\.js$/, '').toUpperCase();
    }

    /**
     * Returns an array of headers that will be applied to the response of the
     * http method.
     *
     * This property can be overridden by child classes.
     */
    protected get responseHeaders(): { [header: string]: string } {
        return this._responseHeaders;
    }

    /**
     * Determines whether or not an API key is required to access the method.
     *
     * This property can be overridden by child classes.
     */
    protected get apiKeyRequired(): boolean {
        return false;
    }

    /**
     * Determines the type of authorization to apply to the method. Defaults to
     * NONE, but can be overridden by child classes.
     */
    protected get authorizationType(): AuthorizationType {
        return AuthorizationType.NONE;
    }

    /**
     * Returns the path to the http method. The default implementation uses the
     * location of the file in the directory tree relative to the api root path
     * to determine the request path.
     *
     * This method can be overridden by child classes.
     *
     * @param apiRootDir The path to the root directory of the API constructs.
     *
     * @return The request path for the http API
     */
    protected getRequestPath(apiRootDir: string): string {
        _argValidator.checkString(apiRootDir, 1, 'Invalid apiRootDir (arg #1)');

        const { dir } = _path.parse(this.filePath);

        const requestPath =
            _path
                .relative(apiRootDir, dir)
                .split(_path.sep)
                .map((token) => {
                    if (token.startsWith('_')) {
                        token = `{${token.replace(/_/, '')}}`;
                    }
                    return token;
                })
                .join('/') + '/';

        return requestPath;
    }

    /**
     * Returns a map of request parameters from path, querystring or headers.
     * The default implementation extracts required path parameters from the
     * method path.
     *
     * This method can be overridden by child classes.
     *
     * @param requestPath The request path to the API method
     *
     * @returns A map of request parameters.
     */
    protected getRequestParameters(requestPath: string): IRequestParams {
        _argValidator.checkString(
            requestPath,
            1,
            'Invalid requestPath (arg #1)',
        );

        const params: Params = {
            header: {},
            path: {},
            querystring: {},
        };
        return requestPath.split('/').reduce((result, param) => {
            if (param.startsWith('{') && param.endsWith('}')) {
                const paramName = param.replace(/[{}]/g, '');
                result.path[paramName] = true;
            }
            return result;
        }, params);
    }

    /**
     * Returns the model for incoming application/json requests.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns The request model for the method.
     */
    protected async getRequestModel(scope: Stack): Promise<IModel> {
        return Model.EMPTY_MODEL;
    }

    /**
     * Returns the default model for the method for 200 response codes.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns The response model for the method.
     */
    protected async getResponseModel(scope: Stack): Promise<IModel> {
        return Model.EMPTY_MODEL;
    }

    /**
     * Returns the request template for the method for application/json
     * requests.  This is an apache velocity template mapping string that can be
     * used to transform the the incoming request into an appropriate message
     * for the back end handler.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns The response template for successful execution
     */
    protected async getRequestTemplate(scope: Stack): Promise<string> {
        return '{ "statusCode": 200 }';
    }

    /**
     * Returns the response template for the method for 200 response codes.
     * This is an apache velocity template mapping string that can be used to
     * transform the response from the method into an HTTP response.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns The response template for successful execution
     */
    protected async getResponseTemplate(scope: Stack): Promise<string> {
        return `$input.json('$')`;
    }

    /**
     * Returns the authorizer associated with the method. Defaults to undefined,
     * but can be overridden by child classes.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns Reference to the authorizer.
     */
    protected async getAuthorizer(
        scope: Stack,
    ): Promise<IAuthorizer | undefined> {
        return undefined;
    }

    /**
     * Returns the lambda handler associated with the method. Defaults to
     * undefined, but can be overridden by child classes.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns Reference to the lambda function, or the name of the function.
     */
    protected async getLambdaHandler(
        scope: Stack,
    ): Promise<IFunction | string | undefined> {
        return undefined;
    }

    /**
     * Returns the role assumed by the API gateway when invoking lambda
     * functions. Defaults to undefined, but can be overridden.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns Reference to the IAM role
     */
    protected async getLambdaInvokeRole(
        scope: Stack,
    ): Promise<Role | undefined> {
        return undefined;
    }

    /**
     * Returns the method responses for the HTTP method. This method can be used
     * to specify the HTTP methods and response models that are mapped to each
     * response code returned to the client.
     *
     * This method can be overridden by child classes if necessary.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns An array of method responses.
     */
    protected async getMethodResponses(
        scope: Stack,
    ): Promise<MethodResponse[]> {
        _argValidator.checkObject(scope, 'Invalid scope (arg #1)');

        const responseParameters: Record<string, boolean> = {};
        Object.keys(this.responseHeaders).forEach((header) => {
            responseParameters[`method.response.header.${header}`] = true;
        });

        const statusCodes = [200, 204, 400, 403, 404, 409, 412, 500, 504];
        return await Promise.map(statusCodes, async (statusCode) => {
            let model;
            switch (statusCode) {
                case 200:
                    model = await this.getResponseModel(scope);
                    break;
                case 204:
                    model = Model.EMPTY_MODEL;
                    break;
                default:
                    model = Model.ERROR_MODEL;
                    break;
            }

            return {
                statusCode: statusCode.toString(),
                responseModels: {
                    'application/json': model,
                },
                responseParameters,
            };
        });
    }

    /**
     * Generates integration responses for the method.
     *
     * This method can be overridden by child classes if necessary.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns An array of method responses.
     */
    protected async getIntegrationResponses(
        scope: Stack,
    ): Promise<IntegrationResponse[]> {
        _argValidator.checkObject(scope, 'Invalid scope (arg #1)');

        const responseParameters = Object.keys(this.responseHeaders).reduce(
            (result: Record<string, string>, header) => {
                result[`method.response.header.${header}`] =
                    this.responseHeaders[header];
                return result;
            },
            {},
        );

        const successResponseTemplate = {
            'application/json': await this.getResponseTemplate(scope),
        };

        return [
            {
                statusCode: '200',
                responseTemplates: successResponseTemplate,
                responseParameters,
            },
            {
                statusCode: '204',
                responseTemplates: RESPONSE_TEMPLATE_EMPTY,
                responseParameters,
            },
            {
                statusCode: '400',
                responseTemplates: RESPONSE_TEMPLATE_ERROR,
                selectionPattern: '\\[((SchemaError)|(BadRequest.*))\\].*',
                responseParameters,
            },
            {
                statusCode: '403',
                responseTemplates: RESPONSE_TEMPLATE_ERROR,
                selectionPattern: '\\[((UnauthorizedError)|(Forbidden.*))\\].*',
                responseParameters,
            },
            {
                statusCode: '404',
                responseTemplates: RESPONSE_TEMPLATE_ERROR,
                selectionPattern: '\\[NotFoundError\\].*',
                responseParameters,
            },
            {
                statusCode: '409',
                responseTemplates: RESPONSE_TEMPLATE_ERROR,
                selectionPattern: '\\[DuplicateRecordError\\].*',
                responseParameters,
            },
            {
                statusCode: '412',
                responseTemplates: RESPONSE_TEMPLATE_ERROR,
                selectionPattern: '\\[ConcurrencyControlError\\].*',
                responseParameters,
            },
            {
                statusCode: '500',
                responseTemplates: RESPONSE_TEMPLATE_ERROR,
                selectionPattern: '\\[Error\\].*|body size is too long',
                responseParameters,
            },
            {
                statusCode: '504',
                responseTemplates: RESPONSE_TEMPLATE_ERROR,
                selectionPattern: '.*Task timed out.*',
                responseParameters,
            },
        ];
    }

    /**
     * Builds and returns a method options object for the current http method.
     * This method constructs options based on some default assumptions, and on
     * the values of certain properties of the class.
     *
     * Child classes can override this method if necessary.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     * @param requestPath The request path of the method.
     *
     * @returns A method options object that can be attached to the method.
     */
    protected async buildMethodOptions(
        scope: Stack,
        requestPath: string,
    ): Promise<MethodOptions> {
        _argValidator.checkObject(scope, 'Invalid scope (arg #1)');
        _argValidator.checkString(
            requestPath,
            1,
            'Invalid requestPath (arg #2)',
        );

        const params = this.getRequestParameters(requestPath);
        const requestParameters = Object.keys(params).reduce(
            (result, sectionName) => {
                const stepKey = sectionName as keyof IRequestParams;
                // This should be - header, path or querystring
                const section = params[stepKey];

                return Object.keys(section).reduce(
                    (result: Record<string, Boolean>, name) => {
                        const required = section[name];
                        result[`method.request.${sectionName}.${name}`] =
                            required;

                        return result;
                    },
                    result,
                );
            },
            {},
        );

        return {
            apiKeyRequired: this.apiKeyRequired,
            authorizationType: this.authorizationType,
            authorizer: await this.getAuthorizer(scope),
            methodResponses: await this.getMethodResponses(scope),
            requestModels: {
                'application/json': await this.getRequestModel(scope),
            },
            requestParameters,
        };
    }

    /**
     * Returns lambda integration options for the http method. This method can
     * be overridden by child classes if necessary.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns Lambda integration options
     */
    protected async buildLambdaIntegrationOptions(
        scope: Stack,
    ): Promise<LambdaIntegrationOptions> {
        _argValidator.checkObject(scope, 'Invalid scope (arg #1)');

        return {
            allowTestInvoke: true,
            proxy: false,
            passthroughBehavior: PassthroughBehavior.NEVER,
            requestTemplates: {
                'application/json': await this.getRequestTemplate(scope),
            },
            integrationResponses: await this.getIntegrationResponses(scope),
            credentialsRole: await this.getLambdaInvokeRole(scope),
        };
    }

    /**
     * Returns lambda integration options for the http method. This method can
     * be overridden by child classes if necessary.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns Lambda integration options
     */
    protected async buildMockIntegrationOptions(
        scope: Stack,
    ): Promise<IntegrationOptions> {
        _argValidator.checkObject(scope, 'Invalid scope (arg #1)');

        return {
            passthroughBehavior: PassthroughBehavior.NEVER,
            requestTemplates: {
                'application/json': await this.getRequestTemplate(scope),
            },
            integrationResponses: await this.getIntegrationResponses(scope),
        };
    }

    /**
     * Returns the method integration for the method. This method returns a
     * lambda integration if the getLambdaHandler() method returns a valid
     * value. If not, a mock integration is returned.
     *
     * @param scope The scope for the current construct - can be used to get
     *        references to other constructs.
     *
     * @returns An array of method responses.
     */
    protected async buildIntegration(scope: Stack): Promise<Integration> {
        _argValidator.checkObject(scope, 'Invalid scope (arg #1)');

        const handler = await this.getLambdaHandler(scope);

        if (typeof handler === 'undefined') {
            // Use mock back end
            return new MockIntegration(
                await this.buildMockIntegrationOptions(scope),
            );
        } else if (typeof handler === 'string') {
            // Use lambda back end but with the lambda handler name. This
            // approach assumes that handler function exists, and that the
            // API gateway has necessary permissions to invoke the function.
            const handlerArn = Arn.format(
                {
                    service: 'lambda',
                    resource: 'function',
                    resourceName: handler,
                    arnFormat: ArnFormat.COLON_RESOURCE_NAME,
                },
                scope as Stack,
            );

            return new AwsIntegration({
                proxy: false,
                service: 'lambda',
                path: `2015-03-31/functions/${handlerArn}/invocations`,
                options: await this.buildLambdaIntegrationOptions(scope),
            });
        } else {
            // Use lambda back end using the handler construct reference.
            return new LambdaIntegration(
                handler,
                await this.buildLambdaIntegrationOptions(scope),
            );
        }
    }
}
