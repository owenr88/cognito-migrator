import { UserImportJobType } from "@aws-sdk/client-cognito-identity-provider";
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
      // TODO: #25 Validate the import schema with the custom attributes in the parent class
      const users = ImportSchema.parse(rawUsers);

      // Import the users
      return this.import(users);
    } catch (e: any) {
      this.log(e?.message, "error");
    }
  }

  async import(
    users: ImportRecordSchemaType[]
  ): Promise<UserImportJobType | undefined> {
    if (!users) {
      this.log("No users to import", "error");
      return;
    }

    // Create the job
    const job = await this.cognito?.createUserImportJob({
      UserPoolId: this.userPoolId,
      JobName: `cognito-import-${new Date().getTime()}`,
      CloudWatchLogsRoleArn: this.iamArn,
    });

    // Error if something went wrong
    if (!job?.UserImportJob) {
      this.log("Error creating the import job", "error");
      return;
    }
    this.log("Created an empty import job: " + job.UserImportJob.JobName);

    // Upload the file
    const res = await fetch(job?.UserImportJob?.PreSignedUrl ?? "", {
      method: "PUT",
      body: Papa.unparse(users, {
        header: true,
        quotes: false,
      }),
      headers: {
        "x-amz-server-side-encryption": "aws:kms",
      },
    });
    if (!res.ok) {
      this.log("Error uploading the user data", "error");
      throw new Error(res.statusText);
    }
    this.log("Uploaded user data to the import job");

    // Startthe job
    await this.cognito?.startUserImportJob({
      JobId: job?.UserImportJob?.JobId ?? "",
      UserPoolId: this.userPoolId,
    });
    this.log("Started the import job for " + users.length + " users");
    return job.UserImportJob;
  }
}
