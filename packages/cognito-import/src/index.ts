import { ImportRecordSchemaType, ImportSchemaType } from "zod-cognito";
import { CognitoImport } from "./importer";

export type ImportCognitoOptions = {
  userPoolId: string;
  profile?: string;
  verbose?: boolean;
  limit?: number;
  iamArn?: string;
};

export const importCognito = async (
  users: ImportSchemaType,
  options: ImportCognitoOptions
) => {
  const importer = new CognitoImport(options);
  await importer.connect();
  return importer.import(users);
};

export type {
  ImportRecordSchemaType as ImportUser,
  ImportSchemaType as ImportUsers,
};

export default importCognito;
