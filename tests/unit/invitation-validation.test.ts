import { describe, expect, it } from "vitest";

import { projectMessages } from "@/lib/projects/messages";
import { validateInvitation } from "@/lib/projects/validation";

describe("validating an Invitation", () => {
  it("accepts an address", () => {
    expect(validateInvitation({ email: "peter@example.com" })).toEqual({});
  });

  it("accepts an address with surrounding whitespace, because that is a paste and not a mistake", () => {
    expect(validateInvitation({ email: "  peter@example.com  " })).toEqual({});
  });

  it("refuses a missing address", () => {
    expect(validateInvitation({ email: "" })).toEqual({ email: projectMessages.inviteeRequired });
    expect(validateInvitation({ email: "   " })).toEqual({ email: projectMessages.inviteeRequired });
  });

  it("refuses something that is not an address", () => {
    expect(validateInvitation({ email: "peter" })).toEqual({
      email: projectMessages.inviteeMalformed,
    });
    expect(validateInvitation({ email: "peter@example" })).toEqual({
      email: projectMessages.inviteeMalformed,
    });
    expect(validateInvitation({ email: "two people@example.com" })).toEqual({
      email: projectMessages.inviteeMalformed,
    });
  });
});
