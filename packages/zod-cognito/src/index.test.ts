import { describe } from "node:test";
import { z } from "zod";
import {
  ImportRecordSchema,
  ImportRecordSchemaType,
  RawImportRecordSchema,
  RawUserAttributesSchema,
  RawUserAttributesSchemaType,
  extractCustomAttributeKeys,
  parseUserAttributes,
  refineExtendedUserAttributesSchema,
} from ".";

describe("UserAttributesSchema", () => {
  const RefinedUserAttributesSchema = refineExtendedUserAttributesSchema(
    RawUserAttributesSchema
  );
  it("should parse with email fields", () => {
    expect(
      RefinedUserAttributesSchema.safeParse({
        sub: "test",
        email: "hello@test.com",
        email_verified: "true",
      }).success
    ).toBe(true);
  });
  it("should not parse email_verified without email", () => {
    expect(
      RefinedUserAttributesSchema.safeParse({
        sub: "test",
        email: "",
        email_verified: "true",
      }).success
    ).toBe(false);
  });
  it("should not parse phone_number_verified without phone_number", () => {
    expect(
      RefinedUserAttributesSchema.safeParse({
        sub: "test",
        phone_number: "",
        phone_number_verified: "true",
      }).success
    ).toBe(false);
  });
  it("should parse with phone_number fields", () => {
    expect(
      RefinedUserAttributesSchema.safeParse({
        sub: "test",
        phone_number: "+1234567890",
        phone_number_verified: "true",
      }).success
    ).toBe(true);
  });
});

describe("parseUserAttributes", () => {
  it("should parse attributes", () => {
    const result = parseUserAttributes([
      { Name: "sub", Value: "test" },
      { Name: "email", Value: "test@test.com" },
      { Name: "email_verified", Value: "true" },
    ]);
    expect(result.sub).toBe("test");
    expect(result.email).toBe("test@test.com");
    expect(result.email_verified).toBe(true);
  });
  it("should parse attributes with custom attributes", () => {
    const result = parseUserAttributes<{ "custom:thing": z.ZodString }>(
      [
        { Name: "sub", Value: "test" },
        { Name: "email", Value: "test@test.com" },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:thing", Value: "test2" },
      ],
      z.object({
        "custom:thing": z.string(),
      })
    );
    console.log(result);
    expect(result.sub).toBe("test");
    expect(result.email).toBe("test@test.com");
    expect(result.email_verified).toBe(true);
    // @ts-expect-error need to fix this
    expect(result["custom:thing"]).toBe("test2");
  });
});

describe("extractCustomAttributeKeys", () => {
  it("should extract custom attributes", () => {
    const keys = extractCustomAttributeKeys([
      { Name: "sub", Value: "test" },
      { Name: "email", Value: "test@test.com" },
      { Name: "email_verified", Value: "true" },
      { Name: "custom:thing_one", Value: "exampl" },
    ]);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe("custom:thing_one");
  });
  it("should not extract when there are no custom attributes", () => {
    const keys = extractCustomAttributeKeys([
      { Name: "sub", Value: "test" },
      { Name: "email", Value: "test@test.com" },
      { Name: "email_verified", Value: "true" },
    ]);
    expect(keys).toHaveLength(0);
  });
});

describe("ImportRecordSchema", () => {
  const birthdate = new Date(2024, 2, 20);
  const baseUser: Omit<RawUserAttributesSchemaType, "sub"> &
    Pick<
      ImportRecordSchemaType,
      "cognito:username" | "cognito:mfa_enabled" | "updated_at"
    > = {
    "cognito:username": "test",
    name: "test",
    given_name: "test",
    family_name: "test",
    middle_name: "test",
    nickname: "test",
    preferred_username: "test",
    profile: "test",
    picture: "test",
    website: "test",
    email: "test@admin.com",
    email_verified: true,
    gender: "test",
    birthdate: birthdate.toISOString(),
    zoneinfo: "test",
    locale: "test",
    phone_number: "1234567890",
    phone_number_verified: true,
    address: "test",
    updated_at: birthdate.getTime(),
    "cognito:mfa_enabled": true,
  };

  it("should have all the required headers", () => {
    const headers = [
      "cognito:username",
      "name",
      "given_name",
      "family_name",
      "middle_name",
      "nickname",
      "preferred_username",
      "profile",
      "picture",
      "website",
      "email",
      "email_verified",
      "gender",
      "birthdate",
      "zoneinfo",
      "locale",
      "phone_number",
      "phone_number_verified",
      "address",
      "updated_at",
      "cognito:mfa_enabled",
    ];
    const schemaHeaders = Object.keys(RawImportRecordSchema.shape);
    expect(headers.filter((h) => !schemaHeaders.includes(h))).toHaveLength(0);
  });
  it("should have required fields", () => {
    expect(RawImportRecordSchema.shape["cognito:username"].isNullable()).toBe(
      false
    );
    expect(
      RawImportRecordSchema.shape["cognito:mfa_enabled"].isNullable()
    ).toBe(false);
  });
  it("should parse with email fields", () => {
    expect(
      ImportRecordSchema.safeParse({
        ...baseUser,
        email: "hello@test.com",
        email_verified: true,
      }).success
    ).toBe(true);
  });
  it("should not parse email_verified without email", () => {
    expect(
      ImportRecordSchema.safeParse({
        ...baseUser,
        email: "",
        email_verified: true,
      }).success
    ).toBe(false);
  });
  it("should not parse phone_number_verified without phone_number", () => {
    expect(
      ImportRecordSchema.safeParse({
        ...baseUser,
        phone_number: "",
        phone_number_verified: true,
      }).success
    ).toBe(false);
  });
  it("should parse with phone_number fields", () => {
    expect(
      ImportRecordSchema.safeParse({
        ...baseUser,
        phone_number: "+1234567890",
        phone_number_verified: true,
      }).success
    ).toBe(true);
  });
  it("should have a valid birth date", () => {
    const result = ImportRecordSchema.parse(baseUser);
    console.log("result", result);
    expect(result.birthdate).toBe("03/20/2024");
  });
});
