-- AlterTable
ALTER TABLE "runtime_states" ADD COLUMN     "critBonusManualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "critBonusOverride" INTEGER,
ADD COLUMN     "slotsManualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slotsOverride" INTEGER;
