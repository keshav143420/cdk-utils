# @vamship/cdk-utils

_A library of utilities that will allow CDK projects to be composed from modular files_

## API Documentation

API documentation can be found [here](https://vamship.github.io/cdk-utils).

## Motivation

[AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) provides a
much needed improvement over hand crafted cloud formation scripts, by allowing
the use of imperative statements to generate a declarative cloudformation
json/yaml file.

However, this library is still limited by the fact that all of the cloud
formation configuration for a stack resides in a single file, which can make the
file verbose and hard to manage as the size of the stack grows.

This library attempts to address this limitation by providing a few utilities
that allow:

- Creation of stacks by loading resources defined within individual files
  instead of cramming multiple resource configurations into a single file.
- The ability to use the organization of resource files on the file system to
  while configuring the resources. For example, resources that represent
  different API routes can be automatically configured based on the path to the
  resource.

While this project draws its inspiration from the now defunct
[wysknd-aws-cf-generator](https://github.com/vamship/grunt-wysknd-aws-cf-generator),
it now leverages the CDK which is supported by AWS.

## Installation

This package can be installed using npm:

```js
npm install --save-dev @vamship/cdk-utils
```

## Usage

This library exposes two key components that allow the development of CDK
resources:

- `ConstructFactory`: This is a class that serves as a lightweight wrapper
  around the initialization and configuration of CDK resources.
- `ConstructBuilder`: This class recursively traverses the file system, and
  loads and initializes all resources found on the file system. Only resources
  of type `ConstructFactory` are loaded, and all other resources are ignored.

### Example

#### File Organization

This example assumes the following file structure:

```
infra
├── constructs
│   ├── functions
│   │   └── hello-func.js
│   └── tables
│       ├── products-table.js
│       └── users-table.js
└── index.js
```

As seen above, the directory structure has a main entry point `index.js`, and
a directory structure, where each file defines a single resource. The entrypoint
defines an instance of the `ConstructBuilder` class, and uses it to traverse
the directory structure under `constructs`. Each resource under `constructs`
defines a resource (dynamodb table/lambda function/etc.) which is wrapped inside
a `ConstructFactory`.

#### Entrypoint

The content of a simple entrypoint file is shown below:

```js
#!/usr/bin/env node

const _path = require('path');

const { App, Stack } = require('aws-cdk-lib');
const { ConstructBuilder } = require('@vamship/cdk-utils');

// Initialize stacks
const app = new App();
const stack1 = new Stack(app, 'my-stack-1');
const stack2 = new Stack(app, 'my-stack-2');

// Build out stack using resources under the constructs directory
const rootDir = _path.join(__dirname, 'constructs');

// Initialize builder
const builder = new ConstructBuilder(rootDir);

// Build out the stacks using custom props if necessary
builder.build(stack2, { keyName: 'username' });
builder.build(stack1, { keyName: 'id' });
```

> NOTE: The construct builder class exposes a `prefetchConstructs()` method that
> can be used to asynchronously load modules prior to building. If not invoked,
> the constructs will be loaded synchronously at build time.

#### Constructs

The contents of the `users-table.js` file is shown below:

```js
'use strict';

const { ConstructFactory } = require('@vamship/cdk-utils');
const _dynamodb = require('aws-cdk-lib/aws-dynamodb');

const factory = new ConstructFactory('user-table');

factory._init = (scope, id, dirInfo, props) => {
    return new _dynamodb.Table(scope, 'UsersTable', {
        partitionKey: {
            name: props.keyName,
            type: _dynamodb.AttributeType.STRING,
        },
    });
};

factory._configure = () => {
    console.log('Configuring user table');
};

module.exports = factory;
```

Each resource is initialized by overriding the `_init()` method, and returning
the initialized resource.

> NOTE: The method to be overridden is `_init()`, not `init()`. Getting this
> wrong will cause unexpected problems. Also remember to return the initialized
> construct from within the method

The `_configure()` method is intended for configuration of the resource after all
resources have been initialized. This method can be used to set up relationships
between resources (granting a function permissions on a table, for example).

> NOTE: The method to be overridden is `_configure()`, not `configure()`.
> Getting this wrong will cause unexpected problems.

The following is an example of the use of the `_configure()` method to setup
permissions, in the `hello-func.js` file:

```js
'use strict';

const { ConstructFactory } = require('@vamship/cdk-utils');
const _lambda = require('aws-cdk-lib/aws-lambda');
const _path = require('path');

const userTableConstruct = require('../tables/users-table');

const factory = new ConstructFactory('hello-func');

const handlerPath = _path.resolve(__dirname, '../../../src/');
console.log(handlerPath);

factory._init = (scope, id, dirInfo, props) => {
    return new _lambda.Function(scope, id, {
        runtime: _lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: _lambda.Code.fromAsset(handlerPath),
    });
};

// Here, the parameter "construct" is a reference to the construct created
// in the _init() method.
factory._configure = (construct, scope, dirInfo, props) => {
    // Get a reference to the initialized table construct.
    const userTable = userTableConstruct.getInstance(scope);

    // Allow the function to access the userTable
    userTable.grantFullAccess(construct);
};

module.exports = factory;
```

## Contributing

Before submitting pull requests, please make sure to run through automated
pre commit tests/linting checks/formatting by running:

```js
grunt all
```
