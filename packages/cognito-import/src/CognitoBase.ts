import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import { IAM } from "@aws-sdk/client-iam";
import chalk from "chalk";
import { z } from "zod";

type CognitoExportProps = {
  userPoolId: string;
  profile?: string;
  verbose?: boolean;
  iamArn?: string;
};

class CognitoBase {
  protected verbose: boolean;
  protected iamArn: string | undefined;
  protected userPoolId: string;
  protected cognito: CognitoIdentityProvider | undefined;
  protected customAttributes: Record<string, z.ZodType<string | number>> = {}

  constructor(options: CognitoExportProps) {
    this.verbose = !!options.verbose;
    this.iamArn = options.iamArn;

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
      this.log("Found user pool " + userPool.UserPool?.Name);

      // Set the custom attributes
      userPool.UserPool?.SchemaAttributes?.forEach((attr) => {
        if (attr.Name && attr.Name.startsWith("custom:")) {
          // TODO: #24 We know the data type of the custom attribute, so we should validate against it
          this.customAttributes[attr.Name] = z.union([z.string(), z.number()])
        }
      });
      if(Object.keys(this.customAttributes).length) {
        this.log('Extracted custom attributes: ' + Object.keys(this.customAttributes).join(','))
      }

      // Create the iamArn if it doesn't exist
      if (!this.iamArn && !!userPool.UserPool?.Arn) {
        // arn:aws:cognito-idp:eu-west-1:000000000000:userpool/eu-west-1_XXXXXXX
        const arn = userPool.UserPool?.Arn;
        const accountId = arn.split(":")[4];
        return this.createIAMRole(parseInt(accountId));
      } else {
        return this.log("Using IAM Role ARN: " + this.iamArn);
      }
    } catch (e: any) {
      this.log(e.message, "error");
      throw e;
    }
  }

  private async createIAMRole(accountId: number) {
    if (this.iamArn) return;
    this.log("No IAM Role ARN passed, creating one");

    // Create the role
    const iam = new IAM({
      region: process.env.AWS_REGION,
    });

    const role = await iam.createRole({
      AssumeRolePolicyDocument: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "cognito-idp.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
      Path: "/service-role/",
      MaxSessionDuration: 3600,
      RoleName: `cognito-import-${new Date().getTime()}`,
      Description: "Automated role for importing users into Cognito",
    });
    if (!role.Role?.Arn) {
      throw new Error("Role not created properly: No ARN");
    }
    this.log("Created IAM Role: " + role.Role.RoleName);

    // Get the policy
    const existingPolicies = await iam.listPolicies({
      PathPrefix: "/service-role/",
    });
    const POLICY_NAME = "cognito-import-policy";
    let policy = existingPolicies.Policies?.find(
      (p) => p.PolicyName === POLICY_NAME
    );

    // Create the policy if there isn't one
    if (!policy) {
      this.log("No IAM Policy found, creating one");
      const createdPolicy = await iam.createPolicy({
        PolicyName: POLICY_NAME,
        Path: "/service-role/",
        Description: "Policy for importing users into Cognito",
        PolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
              ],
              Resource: [
                `arn:aws:logs:${process.env.AWS_REGION}:${accountId}:log-group:/aws/cognito/*`,
              ],
            },
          ],
        }),
      });
      policy = createdPolicy.Policy;
      this.log("Create an IAM Policy: " + policy?.PolicyName);
    }

    // Attach the policy inline to the role
    await iam.attachRolePolicy({
      PolicyArn: policy?.Arn ?? "",
      RoleName: role.Role?.RoleName ?? "",
    });
    this.log("Attached policy to role");

    this.iamArn = role.Role.Arn;
    return this.iamArn;
  }
}

export default CognitoBase;
