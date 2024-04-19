# Cognito Migrator

This repo contains a few dev tools that can be handy to migrate AWS Cognito user pools. It contains:

| Package                                     | Description                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| [cognito-export](/packages/cognito-export)  | Export user records from an AWS Cognito user pool.                          |
| [cognito-import](/packages/cognito-import/) | Import user records into an AWS Cognito user pool.                          |
| [zod-cognito](/packages//zod-cognito/)      | Zod schemas for verifying import and export data in AWS Cognito user pools. |

## Getting started

To use any of the packages, head to the package READMEs in the table above.

## Contributing

Contributions are welcome!

Run `npm run start` to watch all packages for local development.

Please open an issue and create a pull request with any contributions.

## Release

Create a new release in Github to automatically bump the package.json version and release to NPM. Too easy!
