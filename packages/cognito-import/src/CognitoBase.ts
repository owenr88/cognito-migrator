import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import { IAM } from "@aws-sdk/client-iam";
import chalk from "chalk";

type CognitoExportProps = {
  userPoolId: string;
  region?: string;
  profile?: string;
  verbose?: boolean;
  iamArn?: string;
};

class CognitoBase {
  protected verbose: boolean;
  protected iamArn: string | undefined;
  protected userPoolId: string;
  protected cognito: CognitoIdentityProvider | undefined;

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

    if (options.region !== undefined) {
      process.env.AWS_REGION = options.region;
    }
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

      this.log("Found user pool");

      // Create the iamArn if it doesn't exist
      if (!this.iamArn && !!userPool.UserPool?.Arn) {
        this.log("No IAM Role ARN passed, creating one");
        // arn:aws:cognito-idp:eu-west-1:000000000000:userpool/eu-west-1_XXXXXXX
        const arn = userPool.UserPool?.Arn;
        const accountId = arn.split(":")[4];
        await this.createIAMRole(parseInt(accountId));
        this.log("Created IAM Role");
      }
    } catch (e: any) {
      this.log(e.message, "error");
      throw e;
    }
  }

  private async createIAMRole(accountId: number) {
    if (this.iamArn) return;

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
      MaxSessionDuration: 3600,
      RoleName: `cognito-import-${new Date().getTime()}`,
      Description: "Automated role for importing users into Cognito",
      // PolicyDocument: JSON.stringify(policy),
    });
    if (!role.Role?.RoleName) {
      throw new Error("Role name not found");
    }
    this.log("Created IAM Role: " + role.Role?.Arn);

    // Create the policy
    const policy = {
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
            `arn:aws:logs:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:log-group:/aws/cognito/*`,
          ],
        },
      ],
    };

    // Attach the policy inline to the role
    await iam.putRolePolicy({
      PolicyDocument: JSON.stringify(policy),
      PolicyName: `cognito-import-${new Date().getTime()}`,
      RoleName: role.Role?.RoleName ?? "",
    });
    this.log("Attached policy to role");

    this.iamArn = role.Role?.Arn ?? "";
  }
}

export default CognitoBase;
