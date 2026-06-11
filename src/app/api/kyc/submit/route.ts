import { prisma } from "@/lib/db";
import { ApiError, requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

export const POST = withApi(async () => {
  const user = await requireSessionUser();
  const kyc = await prisma.kycProfile.findUnique({ where: { userId: user.id } });
  if (!kyc) throw new ApiError(404, "No KYC profile in progress.");

  const missing: string[] = [];
  if (!kyc.maritalStatus) missing.push("marital status");
  if (!kyc.nationality) missing.push("nationality");
  if (!kyc.employmentStatus) missing.push("employment status");
  if (kyc.maritalStatus === "Married" && !kyc.spouseName) missing.push("spouse name");
  if (kyc.employmentStatus === "Employed" && !kyc.companyName) missing.push("company name");
  if (missing.length) {
    throw new ApiError(422, `Cannot submit — missing: ${missing.join(", ")}.`);
  }

  const [updatedKyc] = await prisma.$transaction([
    prisma.kycProfile.update({
      where: { userId: user.id },
      data: { status: "SUBMITTED", step: 5, submittedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: "SUBMITTED" },
    }),
  ]);

  return ok({ kyc: updatedKyc });
});
