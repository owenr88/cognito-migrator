# Cognito Export

A simple CLI tool and JavaScript package for exporting users from an AWS Cognito user pool.

> This tool works perfectly with [`cognito-import`](#use-with-cognito-import). The user records exported match the import template to easily export from one user pool and import to another.

> Please be vigilant in deleting any local CSV files after use. This is how security leaks happen!

## Getting Started

1. Use it as a CLI tool to export the users to a CSV file

`npx cognito-export -u <user-pool-id> -v`

2. or, use it in Node.js

`npm i cognito-export`

```typescript
import cognitoExport from "cognito-export";

const users = await cognitoExport({
  userPoolId: "<user-pool-id>",
});
```

> All flags and options can be found in the table below.

## 1. CLI Options

A full example of the CLI tool in effect can be found below:

`npx cognito-export -u eu-west-1_aaaaaaaaa -p SOMEPROFILE -v`

| Flag                              | Description                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| -u, --user-pool-id <user-pool-id> | The ID of the AWS Cognito user pool to export from                                                                                                     |
| -p, --profile PROFILEA            | The AWS profile to use for authentication. This will default to the AWS_PROFILE environment variable if left blank, or `default` if that is undefined. |
| -r, --region eu-west-1            | The AWS region of the User Pool. This will default to the AWS_REGION environment variable if left blank, or `eu-west-1` if that is undefined.          |
| -o, --output ./users.csv          | The path to the output CSV file. Defaults to `./users.csv`.                                                                                            |
| -l, --limit 1000                  | Limit the number of users outputted. Defaults to `1000`.                                                                                               |
| -v, --verbose                     | Show all logs and errors in the console. Defaults to `true`.                                                                                           |
| -h, --help                        | See all flags and options                                                                                                                              |

## 2. Node.js Example

A full example of the package in effect can be found below:

```typescript
import cognitoExport from "cognito-export";

const users = await cognitoExport({
  userPoolId: "eu-west-1_aaaaaaaaa",
  profile: "SOMEPROFILE",
  region: "eu-west-1",
});
```

> Please note: This method supports all flags documented above, **except** the output and verbose flags. Instead, the method just returns the user records to store somewhere.

## Use with [cognito-import](../cognito-import/)

```bash
npx cognito-export -u eu-west-1_aaaaaaaaa -p PROFILE_A &&
npx cognito-import -u eu-west-1_bbbbbbbbb -p PROFILE_B -j import-12345 -f users.csv
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
