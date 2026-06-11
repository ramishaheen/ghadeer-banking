import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const kyc = await prisma.kycProfile.findUnique({ where: { userId: user.id } });
  return ok({ kyc, kycStatus: user.kycStatus });
});

// Steps (matching the designed 5-frame flow):
// 1 trigger accepted → 2 section overview → 3 personal info → 4 work details → 5 submit
const StepSchema = z.object({
  step: z.number().int().min(1).max(5),
  personal: z
    .object({
      maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]),
      spouseName: z.string().max(80).optional().or(z.literal("")),
      dependents: z.number().int().min(0).max(20).optional(),
      nationality: z.string().min(1).max(60),
    })
    .optional(),
  work: z
    .object({
      employmentStatus: z.enum(["Employed", "Self-employed", "Retired", "Student", "Unemployed"]),
      companyName: z.string().max(120).optional().or(z.literal("")),
      jobTitle: z.string().max(120).optional().or(z.literal("")),
      monthlyIncome: z.string().max(40).optional().or(z.literal("")),
    })
    .optional(),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const body = StepSchema.parse(await req.json());

  // Validation rule from the design: married applicants confirm spouse details.
  if (body.personal?.maritalStatus === "Married" && !body.personal.spouseName) {
    throw new ApiError(400, "Spouse name is required when marital status is Married.");
  }
  if (body.work?.employmentStatus === "Employed" && !body.work.companyName) {
    throw new ApiError(400, "Company name is required when employment status is Employed.");
  }

  const existing = await prisma.kycProfile.findUnique({ where: { userId: user.id } });
  const data = {
    step: Math.max(existing?.step ?? 0, body.step),
    ...(body.personal
      ? {
          maritalStatus: body.personal.maritalStatus,
          spouseName: body.personal.spouseName || null,
          dependents: body.personal.dependents ?? null,
          nationality: body.personal.nationality,
        }
      : {}),
    ...(body.work
      ? {
          employmentStatus: body.work.employmentStatus,
          companyName: body.work.companyName || null,
          jobTitle: body.work.jobTitle || null,
          monthlyIncome: body.work.monthlyIncome || null,
        }
      : {}),
  };

  const kyc = existing
    ? await prisma.kycProfile.update({ where: { userId: user.id }, data })
    : await prisma.kycProfile.create({ data: { userId: user.id, ...data } });

  if (user.kycStatus === "DUE") {
    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: "IN_PROGRESS" } });
  }

  return ok({ kyc });
});
