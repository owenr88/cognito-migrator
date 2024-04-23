#!/usr/bin/env node

import { program } from "commander";
import path from "path";
import { CognitoExport } from "./exporter";

export type Options = {
  userPoolId: string;
  profile: string;
  verbose: boolean;
  limit: string;
  output: string;
};

const main = async () => {
  program
    .requiredOption("-u, --user-pool-id <user-pool-id>", "User Pool ID")
    .option("-p, --profile <profile>", "AWS Profile", undefined)
    .option(
      "-o, --output <output>",
      "The file location to output the users to",
      path.join(process.cwd(), `users.csv`)
    )
    .option("-l, --limit <limit>", "Limit the number of users returned", "1000")
    .option("-v, --verbose", "Show all log messages", false)
    .action(async () => {
      const options = program.opts<Options>();
      try {
        const exporter = new CognitoExport({
          userPoolId: options.userPoolId,
          profile: options.profile,
          verbose: options.verbose,
        });
        await exporter.connect();
        const users = await exporter.getUsers(parseInt(options.limit));
        await exporter.export(users, options.output);
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
