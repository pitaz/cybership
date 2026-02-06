import { z } from "zod";

const addressLine = z.string().min(1).max(35);
const city = z.string().min(1).max(30);
const stateCode = z.string().length(2).optional();
const postalCode = z.string().min(1).max(9);
const countryCode = z.string().length(2);

export const addressSchema = z.object({
  addressLine: z.array(addressLine).min(1).max(3),
  city,
  stateProvinceCode: stateCode,
  postalCode,
  countryCode,
  residential: z.boolean().optional(),
});

export const packageDimensionsSchema = z.object({
  lengthInches: z.number().positive().finite(),
  widthInches: z.number().positive().finite(),
  heightInches: z.number().positive().finite(),
});

export const packageSchema = z.object({
  weightLbs: z.number().positive().finite(),
  dimensions: packageDimensionsSchema,
});

export const rateRequestSchema = z.object({
  origin: addressSchema,
  destination: addressSchema,
  package: packageSchema,
  serviceLevel: z.string().min(1).max(50).optional(),
});

export type ValidatedAddress = z.infer<typeof addressSchema>;
export type ValidatedPackage = z.infer<typeof packageSchema>;
export type ValidatedRateRequest = z.infer<typeof rateRequestSchema>;
