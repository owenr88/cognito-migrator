import { describe } from "node:test";
import { z } from "zod";
import { UserAttributesSchema, parseUserAttributes } from ".";

describe("zod-cognito", () => {
  describe("UserAttributesSchema", () => {
    it("should be defined", () => {
      expect(UserAttributesSchema).toBeDefined();
    });
    it("should parse with email fields", () => {
      const result = UserAttributesSchema.safeParse({
        sub: "test",
        email: "hello@test.com",
        email_verified: "true",
      });
      expect(result.success).toBe(true);
    });
    it("should not parse email_verified without email", () => {
      expect(
        UserAttributesSchema.safeParse({
          sub: "test",
          email: "",
          email_verified: "true",
        }).success
      ).toBe(false);
    });
    it("should not parse phone_number_verified without phone_number", () => {
      expect(
        UserAttributesSchema.safeParse({
          sub: "test",
          phone_number: "",
          phone_number_verified: "true",
        }).success
      ).toBe(false);
    });
    it("should parse with phone_number fields", () => {
      const result = UserAttributesSchema.safeParse({
        sub: "test",
        phone_number: "+1234567890",
        phone_number_verified: "true",
      });
      expect(result.success).toBe(true);
    });
    it("should not parse without email or phone_number fields", () => {
      expect(
        UserAttributesSchema.safeParse({
          sub: "test",
          email_verified: "false",
          phone_number_verified: "false",
        }).success
      ).toBe(false);
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
      // expect(result["custom:thing"]).toBe("test2");
    });
  });
});
