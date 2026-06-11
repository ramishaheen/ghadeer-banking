import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const [accounts, kyc, alerts] = await Promise.all([
    prisma.account.findMany({ where: { userId: user.id }, orderBy: { type: "asc" } }),
    prisma.kycProfile.findUnique({ where: { userId: user.id } }),
    prisma.priceAlert.count({ where: { userId: user.id, active: true } }),
  ]);
  const totalMils = accounts.reduce((s, a) => s + a.balanceMils, 0);
  return ok({
    user: {
      id: user.id,
      name: user.name,
      nameAr: user.nameAr,
      membership: user.membership,
      kycStatus: user.kycStatus,
      kycDueAt: user.kycDueAt,
      locale: user.locale,
    },
    totalMils,
    accounts,
    kyc: kyc ? { step: kyc.step, status: kyc.status } : null,
    activeAlerts: alerts,
  });
});
