import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  code: z
    .string()
    .trim()
    .min(6, "Code must be at least 6 characters."),
});

export const pinSchema = z
  .object({
    pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits."),
    confirmPin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits."),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match.",
    path: ["confirmPin"],
  });
