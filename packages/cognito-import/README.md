# Cognito Import

A simple CLI tool and JavaScript package for importing users into an AWS Cognito user pool.

> This tool works perfectly with [`cognito-export`](#use-with-cognito-export). The user records exported match the import template to easily export from one user pool and import to another.

## Getting Started

1. Use it as a CLI tool to import users from a CSV file into a user pool

`npx cognito-import -u <user-pool-id> -l`

2. or, use it in Node.js

`npm i cognito-import`

```typescript
import cognitoImport from "cognito-import";

await cognitoImport(users, {
  userPoolId: "<user-pool-id>",
});
```

> All flags and options can be found in the table below.

## 1. CLI Options

A full example of the CLI tool in effect can be found below:

`npx cognito-import -u eu-west-1_aaaaaaaaa -p SOMEPROFILE -v -f ./users.csv`

| Flag                              | Description                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| -u, --user-pool-id <user-pool-id> | The ID of the AWS Cognito user pool to import into                                                                                                     |
| -p, --profile PROFILEA            | The AWS profile to use for authentication. This will default to the AWS_PROFILE environment variable if left blank, or `default` if that is undefined. |
| -f, --file ./users.csv            | The path to the CSV file to import. Defaults to `./users.csv`.                                                                                         |
| -v, --verbose                     | Show all logs and errors in the console. Defaults to `true`.                                                                                           |
| -h, --help                        | See all flags and options                                                                                                                              |

## 2. Node.js Example

A full example of the package in effect can be found below:

```typescript
import cognitoImport, { ImportUsers } from "cognito-import";

const users: ImportUsers = []; // Get your users ready

await cognitoImport(users, {
  userPoolId: "eu-west-1_aaaaaaaaa",
  profile: "SOMEPROFILE",
});
```

> Please note: This method supports all flags documented above, **except** the file and verbose flags. Instead, the method expects the users to be passed in.

## Use with [cognito-export](../cognito-export/)

```bash
npx cognito-export -u eu-west-1_aaaaaaaaa -p PROFILE_A &&
npx cognito-import -u eu-west-1_bbbbbbbbb -p PROFILE_B -f users.csv
```

or

```typescript
import cognitoExport from "cognito-export";
import cognitoImport from "cognito-import";

const users = await cognitoExport({
  userPoolId: "eu-west-1_aaaaaaaaa",
  profile: "PROFILE_A",
});

await cognitoImport(users, {
  jobId: "import-12345",
  userPoolId: "eu-west-2_bbbbbbbbb",
  profile: "PROFILE_B",
}).start();
```
