import { CognitoExport } from "./exporter";

export type ExportCognitoOptions = {
  userPoolId: string;
  region?: string;
  profile?: string;
  verbose?: boolean;
  limit?: number;
};

export const exportCognito = async (options: ExportCognitoOptions) => {
  const exporter = new CognitoExport(options);
  await exporter.connect();
  const users = await exporter.getUsers(options.limit ?? 1000);
  return users;
};

export default exportCognito;
