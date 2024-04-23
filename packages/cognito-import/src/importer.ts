import fs from "fs";
import fetch from "node-fetch";
import Papa from "papaparse";
import { ImportRecordSchemaType, ImportSchema } from "zod-cognito";
import CognitoBase from "./CognitoBase";

export class CognitoImport extends CognitoBase {
  async importFromFile(location: string) {
    try {
      // Check it exists
      if (!fs.existsSync(location)) {
        this.log("File not found: " + location, "error");
        return;
      }

      // Read the file
      const contents = fs.readFileSync(location, "utf8");
      const rawUsers = Papa.parse(contents, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      }).data;

      // Verify the contents
      const users = ImportSchema.parse(rawUsers);
      console.log(users);

      // Import the users
      // return this.import(users);
    } catch (e: any) {
      // this.log(e?.message, "error");
    }
  }

  async import(users: ImportRecordSchemaType[]) {
    if (!users) {
      return this.log("No users to import", "error");
    }

    // Create the job
    const job = await this.cognito?.createUserImportJob({
      UserPoolId: this.userPoolId,
      JobName: `import-${new Date().getTime()}`,
      CloudWatchLogsRoleArn: this.iamArn,
    });

    // Error if something went wrong
    if (!job?.UserImportJob) {
      this.log("Error creating the import job", "error");
      return;
    }
    this.log("Created an empty import job");

    // Upload the file
    await fetch(job?.UserImportJob?.PreSignedUrl ?? "", {
      method: "PUT",
      body: Papa.unparse(users, {
        header: true,
        quotes: false,
      }),
    });
    this.log("Uploaded user data to the import job");

    // Startthe job
    await this.cognito?.startUserImportJob({
      JobId: job?.UserImportJob?.JobId ?? "",
      UserPoolId: this.userPoolId,
    });
    this.log("Started the import job for " + users.length + " users");
  }
}
