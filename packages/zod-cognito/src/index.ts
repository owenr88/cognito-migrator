import { AttributeType } from "@aws-sdk/client-cognito-identity-provider";
import { format, getUnixTime, isValid } from "date-fns";
import z from "zod";

/**
 * The attributes that can be exported from Cognito
 * */
const StringBoolean = z
  .union([z.literal("true"), z.literal("false")])
  .optional()
  .default("false")
  .transform((val) => val === "true");

export const UserAttributesSchema = z
  .object({
    sub: z.string(),
    name: z.string().optional().default(""),
    given_name: z.string().optional().default(""),
    family_name: z.string().optional().default(""),
    middle_name: z.string().optional().default(""),
    nickname: z.string().optional().default(""),
    preferred_username: z.string().optional().default(""),
    profile: z.string().optional().default(""),
    picture: z.string().optional().default(""),
    website: z.string().optional().default(""),
    gender: z.string().optional().default(""),
    birthdate: z
      .string()
      .optional()
      .transform((v) => {
        if (!v) return v;
        if (!isValid(new Date(v))) return "";
        return new Date(v).toISOString();
      })
      .default(""),
    zoneinfo: z.string().optional().default(""),
    locale: z.string().optional().default(""),
    address: z.string().optional().default(""),
    email_verified: StringBoolean,
    email: z.string().optional().default(""),
    phone_number_verified: StringBoolean,
    phone_number: z.string().optional().default(""),
  })
  .refine((schema) => {
    if (!schema.email_verified && !schema.phone_number_verified) {
      return false;
    }
    return true;
  }, 'One of "email_verified" or "phone_number_verified" must be true')
  .refine((schema) => {
    if (schema.email_verified && !schema.email) {
      return false;
    }
    return true;
  }, 'If "email_verified" is true, "email" must be provided')
  .refine((schema) => {
    if (schema.phone_number_verified && !schema.phone_number) {
      return false;
    }
    return true;
  }, 'If "phone_number_verified" is true, "phone_number" must be provided');
export type UserAttributesSchemaType = z.infer<typeof UserAttributesSchema>;

export const parseUserAttributes = <
  CustomAttributes extends z.ZodRawShape = { [k: string]: z.ZodString },
>(
  attributes: AttributeType[] | undefined,
  customAttributes?: z.ZodObject<CustomAttributes>
): z.infer<
  typeof UserAttributesSchema & typeof z.ZodObject<CustomAttributes>
> => {
  const Schema = UserAttributesSchema.and(customAttributes ?? z.object({}));
  return Schema.parse(
    attributes?.reduce(
      (acc, { Name, Value }) => {
        if (!Name) return acc;
        return { ...acc, [Name]: Value };
      },
      {} as z.infer<typeof Schema>
    )
  );
};

/**
 * A default string transformer
 */
const zDefaultString = z
  .string()
  .min(0)
  .nullish()
  .transform((s) => s ?? "");

/**
 * The attributes that can be imported into Cognito
 */
export const RawImportRecordSchema = z.object({
  // Required
  "cognito:username": z.string(),
  "cognito:mfa_enabled": z.boolean(),

  // Optional
  name: zDefaultString,
  given_name: zDefaultString,
  family_name: zDefaultString,
  middle_name: zDefaultString,
  nickname: zDefaultString,
  preferred_username: zDefaultString,
  profile: zDefaultString,
  picture: zDefaultString,
  website: zDefaultString,
  gender: zDefaultString,
  birthdate: zDefaultString.transform((d) => {
    if (!d) return d;
    if (!isValid(new Date(d))) return "";
    return format(new Date(d), "MM/dd/yyyy");
  }),
  zoneinfo: zDefaultString,
  locale: zDefaultString,
  address: zDefaultString,
  updated_at: z.coerce.date().transform(getUnixTime),
  email_verified: z.boolean(),
  email: zDefaultString,
  phone_number_verified: z.boolean(),
  phone_number: zDefaultString.transform((v) => (v ? parseInt(v) : "")),
});

export const ImportRecordSchema = RawImportRecordSchema.refine((schema) => {
  if (!schema.email_verified && !schema.phone_number_verified) {
    return false;
  }
  return true;
}, 'One of "email_verified" or "phone_number_verified" must be true')
  .refine((schema) => {
    if (schema.email_verified && !schema.email) {
      return false;
    }
    return true;
  }, 'If "email_verified" is true, "email" must be provided')
  .refine((schema) => {
    if (schema.phone_number_verified && !schema.phone_number) {
      return false;
    }
    return true;
  }, 'If "phone_number_verified" is true, "phone_number" must be provided')
  .refine((schema) => {
    const rowSize = JSON.stringify(schema).length;
    return rowSize <= 16000;
  }, "The maximum row size is 16,000 characters");

export type ImportRecordSchemaType = z.infer<typeof ImportRecordSchema>;

export const ImportSchema = z
  .array(ImportRecordSchema)
  .min(1)
  .max(500000)
  .refine((records) => {
    // Make sure all records have a unique username
    const usernames = records.map((record) => record["cognito:username"]);
    return usernames.length === records.length;
  }, "All records must have a unique username")
  .transform((records) => {
    // Escape all commas in each field
    return records.map((record) => {
      return Object.entries(record).reduce(
        (acc, [key, value]) => {
          if (typeof value !== "string") {
            return {
              ...acc,
              [key]: value,
            };
          }
          return { ...acc, [key]: value?.toString().replace(/,/g, "\\,") };
        },
        {} as typeof record
      );
    });
  });

export type ImportSchemaType = z.infer<typeof ImportSchema>;
