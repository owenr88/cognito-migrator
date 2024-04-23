#!/usr/bin/env node

import { program } from "commander";
import * as fs from "fs";
import path from "path";

import { CognitoImport } from "./importer";

export type Options = {
  userPoolId: string;
  profile?: string;
  file: string;
  iam?: string;
  verbose?: boolean;
};

const main = async () => {
  program
    .requiredOption("-u, --user-pool-id <user-pool-id>", "User Pool ID")
    .option("-p, --profile <profile>", "AWS Profile", undefined)
    .requiredOption(
      "-f, --file <file>",
      "The file location to import the users from",
      path.join(process.cwd(), `users.csv`)
    )
    .option(
      "-i, --iam <iam-arn>",
      "The arn for the IAM role. If left blank, one will be created."
    )
    .option("-v, --verbose", "Show all log messages", false)
    .action(async () => {
      const options = program.opts<Options>();
      try {
        if (!fs.existsSync(options.file)) {
          throw new Error(`File not found: ${options.file}`);
        }
        const importer = new CognitoImport({
          userPoolId: options.userPoolId,
          profile: options.profile,
          verbose: options.verbose,
          iamArn: options.iam,
        });
        await importer.connect();
        await importer.importFromFile(options.file);
      } catch (e) {
        if (options.verbose) {
          console.error(e);
        }
        return;
      }
    });
  await program.parseAsync();
};

main();
