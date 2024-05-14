import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import chalk from "chalk";
import { z } from "zod";

export type CognitoExportProps = {
  userPoolId: string;
  profile?: string;
  verbose?: boolean;
};

class CognitoBase {
  protected verbose: boolean;
  protected userPoolId: string;
  protected cognito: CognitoIdentityProvider | undefined;
  protected customAttributes: Record<string, z.ZodType<string | number>> = {}

  constructor(options: CognitoExportProps) {
    this.verbose = !!options.verbose;

    this.userPoolId = options.userPoolId;
    if (!this.userPoolId) {
      throw new Error("User Pool ID is required");
    }

    if (options.profile !== undefined) {
      process.env.AWS_PROFILE = options.profile;
    }
    if (process.env.AWS_PROFILE === undefined) {
      process.env.AWS_PROFILE = "default";
    }

    process.env.AWS_REGION = options.userPoolId.split("_")[0];
    if (process.env.AWS_REGION === undefined) {
      process.env.AWS_REGION = "eu-west-1";
    }

    this.log("Using profile: " + process.env.AWS_PROFILE);
    this.log("Using region: " + process.env.AWS_REGION);
  }

  protected log(
    val: string,
    type: "error" | "warn" | "success" | "info" = "info"
  ) {
    if (!this.verbose) return;
    if (type === "success") {
      return console.log(chalk.bgGreen(val));
    }
    if (type === "error") {
      return console.log(chalk.bold.red(val));
    }
    if (type === "warn") {
      return console.log(chalk.hex("#FFA500")(val));
    }
    return console.log(chalk.hex("30D5C8")(val));
  }

  public async connect() {
    try {
      // This will use AWS_REGION and AWS_PROFILE for the credentials
      this.cognito = new CognitoIdentityProvider({
        region: process.env.AWS_REGION,
      });

      // Get the user pool
      const userPool = await this.cognito.describeUserPool({
        UserPoolId: this.userPoolId,
      });

      // Check for the user pool
      if (userPool.$metadata.httpStatusCode === 404) {
        return this.log("User Pool does not exist", "error");
      }

      // Error if we can't access the user pool
      if (userPool.$metadata.httpStatusCode?.toString().charAt(0) === "4") {
        return this.log(
          "Error accessing user pool: " + userPool.$metadata.httpStatusCode,
          "error"
        );
      }

      // Set the custom attributes
      userPool.UserPool?.SchemaAttributes?.forEach((attr) => {
        if (attr.Name && attr.Name.startsWith("custom:")) {
          this.customAttributes[attr.Name] = z.union([z.string(), z.number()]);
        }
      });
      if(Object.keys(this.customAttributes).length) {
        this.log('Extracted custom attributes: ' + Object.keys(this.customAttributes).join(','))
      }

      this.log("Found user pool");
    } catch (e: any) {
      this.log(e.message, "error");
      throw e;
    }
  }
}

export default CognitoBase;
