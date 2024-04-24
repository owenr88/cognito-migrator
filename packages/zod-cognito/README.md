# Zod Cognito

This package includes a few useful Zod Schemas for AWS Cognito. It includes schemas for importing and exporting, as well as parsing user attributes.

> Please check out the other packages, [https://www.npmjs.com/package/cognito-export]() and [https://www.npmjs.com/package/cognito-import]() for... exporting and importing.

## Getting started

`npm i zod-cognito`

## Documentation

Schema configurations are based on [Cognito's documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool-csv-header.html) for importing.

### 1. Importing records

```typescript
import z from "zod";
import { ImportRecordSchema, ImportSchema } from "zod-cognito";

// 1. Verify a single record for importing in the CSV file
const record = ImportRecordSchema.parse(user);

// 2. Verify a list of records for importing in a CSV file
const records = ImportSchema.parse(users);

// 3. Import with a custom attribute
const CustomRecordSchema = ImportRecordSchema.extend({
  "custom:thing": z.string(),
});
const customRecord = CustomRecordSchema.parse(user);
const customRecords = z.array(CustomRecordSchema).parse(users);
```

> Check out [https://www.npmjs.com/package/cognito-import] for importing users, which automatically has this schema verification built in.

### 2. Parsing UserAttributes

```typescript
import z from "zod";
import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { parseUserAttributes } from "zod-cognito";

const userAttributes: AttributeListType = [
  /** UserAttributes from Cognito: { Name: string; Value?: string } **/
];

// 1. Parse default user attributes
const attribs = parseUserAttributes(userAttributes);

// 2. Parse with custom attributes
const CustomSchema = z.object({
  "custom:thing": "example",
});
const withCustomAttribs = parseUserAttributes(userAttributes, CustomSchema);
```
