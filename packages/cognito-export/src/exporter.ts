import { ListUsersRequest } from "@aws-sdk/client-cognito-identity-provider";
import * as fs from "fs";
import Papa from "papaparse";
import {
  ImportRecordSchema,
  ImportRecordSchemaType,
  parseUserAttributes,
} from "zod-cognito";
import CognitoBase from "./CognitoBase";

export class CognitoExport extends CognitoBase {
  async getUsers(limit: number) {
    try {
      let users: ImportRecordSchemaType[] = [];
      let paginationToken: string | undefined = "";
      while (paginationToken !== undefined && users.length < limit) {
        // Set the export params
        const params: ListUsersRequest = {
          UserPoolId: this.userPoolId,
          Limit: Math.min(60, limit - users.length),
        };
        if (paginationToken) {
          params.PaginationToken = paginationToken;
        }

        // Get the users
        const res = await this.cognito?.listUsers(params);

        // Loop through the users and parse them into the array
        res?.Users?.forEach((user) => {
          if (users.length >= limit) return false;

          // Map the attributes to a key-value object
          console.log(user.Attributes);
          const attrbs = parseUserAttributes(user.Attributes);
          console.log(attrbs);

          // Return if some core data isn't there
          if (!user.Username) {
            this.log(
              "Skipping: No username found for user " +
                attrbs.name +
                "/" +
                attrbs.email +
                "/" +
                attrbs.phone_number,
              "warn"
            );
            return false;
          }
          if (!attrbs) {
            this.log(
              "Skipping: No attributes found for user " + user.Username,
              "warn"
            );
            return false;
          }

          // Add the user to the list
          const newUser = ImportRecordSchema.safeParse({
            "cognito:username": user.Username,
            "cognito:mfa_enabled": false,
            updated_at: (user.UserLastModifiedDate ?? new Date()).toISOString(),
            ...attrbs,
          });
          if (!newUser.success) {
            this.log(
              "Skipping: Exported user data is not valid: " +
                newUser.error.message,
              "warn"
            );
            return false;
          }
          users.push(newUser.data);
        });
        paginationToken = res?.PaginationToken;
      }

      this.log("Total users exported: " + users.length);
      return users;
    } catch (error: any) {
      this.log(error?.message, "error");
    }
  }

  async export(users: ImportRecordSchemaType[] | undefined, location: string) {
    if (!users?.length) {
      return this.log("No users found", "error");
    }
    const csv = Papa.unparse(users, {
      header: true,
      quotes: false,
    });
    fs.writeFileSync(location, csv, "utf8");
    this.log("Users exported to " + location, "success");
  }
}
