/*
  Warnings:

  - You are about to drop the column `factionId` on the `reputations` table. All the data in the column will be lost.
  - You are about to drop the `factions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[characterId,raceId]` on the table `reputations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `raceId` to the `reputations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NpcTypaj" AS ENUM ('tank', 'attacker', 'mage', 'healer');

-- CreateEnum
CREATE TYPE "GroupModifierType" AS ENUM ('fixed', 'dice');

-- DropForeignKey
ALTER TABLE "reputations" DROP CONSTRAINT "reputations_factionId_fkey";

-- DropIndex
DROP INDEX "reputations_characterId_factionId_key";

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "groupBonusNotes" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "npcTier" INTEGER,
ADD COLUMN     "npcTypaj" "NpcTypaj",
ADD COLUMN     "rolledModifier" INTEGER;

-- AlterTable
ALTER TABLE "reputations" DROP COLUMN "factionId",
ADD COLUMN     "raceId" TEXT NOT NULL;

-- DropTable
DROP TABLE "factions";

-- CreateTable
CREATE TABLE "npc_archetypes" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "typaj" "NpcTypaj" NOT NULL,
    "hitChance" INTEGER NOT NULL,
    "baseHp" TEXT NOT NULL,
    "dodge" INTEGER NOT NULL DEFAULT 0,
    "armor" INTEGER NOT NULL DEFAULT 0,
    "bubbleSlots" INTEGER NOT NULL DEFAULT 0,
    "weapons" JSONB NOT NULL DEFAULT '[]',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "npc_archetypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modifierType" "GroupModifierType" NOT NULL DEFAULT 'fixed',
    "modifierValue" DECIMAL(6,3),
    "modifierDice" TEXT,
    "specialEffect" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "npc_archetypes_raceId_typaj_key" ON "npc_archetypes"("raceId", "typaj");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "reputations_characterId_raceId_key" ON "reputations"("characterId", "raceId");

-- AddForeignKey
ALTER TABLE "npc_archetypes" ADD CONSTRAINT "npc_archetypes_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
