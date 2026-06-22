-- CreateEnum
CREATE TYPE "Role" AS ENUM ('player', 'gm', 'admin');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('head', 'body', 'legs', 'vambraces', 'weapon_left', 'weapon_right', 'ring', 'amulet', 'pet');

-- CreateEnum
CREATE TYPE "StatAttribute" AS ENUM ('strength', 'dexterity', 'intelligence', 'spirit', 'endurance', 'luck');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('innate', 'acquired');

-- CreateEnum
CREATE TYPE "ItemLocation" AS ENUM ('backpack', 'equipped_head', 'equipped_body', 'equipped_legs', 'equipped_vambraces', 'equipped_weapon_left', 'equipped_weapon_right', 'equipped_ring', 'equipped_amulet', 'equipped_pet');

-- CreateEnum
CREATE TYPE "BackpackItemType" AS ENUM ('food', 'scroll', 'herb', 'potion', 'misc', 'quest', 'other');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'player',
    "gmSkipConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "skillType" "SkillType" NOT NULL,
    "occupiesSlot" BOOLEAN NOT NULL DEFAULT true,
    "tier" INTEGER NOT NULL,
    "guildId" TEXT,
    "tiedAttribute" "StatAttribute",
    "manaCost" INTEGER,
    "apCost" INTEGER,
    "icon" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wild_magic_cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effect" TEXT,
    "skillId" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wild_magic_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slotType" "SlotType" NOT NULL,
    "weaponFamily" TEXT,
    "isTwoHanded" BOOLEAN NOT NULL DEFAULT false,
    "tier" INTEGER NOT NULL,
    "requiredAttribute" "StatAttribute",
    "damageDice" TEXT,
    "bonusCritDice" TEXT,
    "scalingAttribute" "StatAttribute",
    "scalingCoefficient" DECIMAL(5,3),
    "statBonuses" JSONB,
    "hungerRestored" INTEGER,
    "referencePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "icon" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "item_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_template_skills" (
    "templateId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "item_template_skills_pkey" PRIMARY KEY ("templateId","skillId")
);

-- CreateTable
CREATE TABLE "rule_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "rule_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_characters" (
    "campaignId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "campaign_characters_pkey" PRIMARY KEY ("campaignId","characterId")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raceId" TEXT,
    "isNpc" BOOLEAN NOT NULL DEFAULT false,
    "appearanceImage" TEXT,
    "quenta" TEXT,
    "mainQuest" TEXT,
    "questProgressStage" INTEGER NOT NULL DEFAULT 0,
    "playerNotes" TEXT,
    "unallocatedPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_attributes" (
    "characterId" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 3,
    "dexterity" INTEGER NOT NULL DEFAULT 3,
    "intelligence" INTEGER NOT NULL DEFAULT 3,
    "spirit" INTEGER NOT NULL DEFAULT 3,
    "endurance" INTEGER NOT NULL DEFAULT 3,
    "luck" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_attributes_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "runtime_states" (
    "characterId" TEXT NOT NULL,
    "currentHp" INTEGER NOT NULL DEFAULT 0,
    "currentMana" INTEGER NOT NULL DEFAULT 0,
    "currentAp" INTEGER NOT NULL DEFAULT 0,
    "satietyCurrent" INTEGER NOT NULL DEFAULT 0,
    "bubbleActive" BOOLEAN NOT NULL DEFAULT false,
    "bubblePersistChanceCurrent" INTEGER NOT NULL DEFAULT 0,
    "activeEffects" JSONB NOT NULL DEFAULT '[]',
    "hpMaxComputed" INTEGER NOT NULL DEFAULT 0,
    "hpMaxOverride" INTEGER,
    "hpMaxManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "hpMaxOverrideAuthor" TEXT,
    "hpMaxOverrideAt" TIMESTAMP(3),
    "manaMaxComputed" INTEGER NOT NULL DEFAULT 0,
    "manaMaxOverride" INTEGER,
    "manaMaxManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "manaMaxOverrideAuthor" TEXT,
    "manaMaxOverrideAt" TIMESTAMP(3),
    "apMaxComputed" INTEGER NOT NULL DEFAULT 0,
    "apMaxOverride" INTEGER,
    "apMaxManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "apMaxOverrideAuthor" TEXT,
    "apMaxOverrideAt" TIMESTAMP(3),
    "dodgeComputed" INTEGER NOT NULL DEFAULT 0,
    "dodgeOverride" INTEGER,
    "dodgeManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "dodgeOverrideAuthor" TEXT,
    "dodgeOverrideAt" TIMESTAMP(3),
    "armorComputed" INTEGER NOT NULL DEFAULT 0,
    "armorOverride" INTEGER,
    "armorManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "armorOverrideAuthor" TEXT,
    "armorOverrideAt" TIMESTAMP(3),
    "bubbleCharges" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_states_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "currencies" (
    "characterId" TEXT NOT NULL,
    "balanceBronze" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "currency_transactions" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "amountBronze" DECIMAL(12,2) NOT NULL,
    "moneyTarget" TEXT NOT NULL,
    "relatedItemInstanceId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_instances" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "templateId" TEXT,
    "overrides" JSONB,
    "acquiredPrice" DECIMAL(12,2),
    "location" "ItemLocation" NOT NULL DEFAULT 'backpack',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backpack_slots" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemType" "BackpackItemType" NOT NULL DEFAULT 'misc',
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT,

    CONSTRAINT "backpack_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_skills" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_skill_tags" (
    "characterId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "character_skill_tags_pkey" PRIMARY KEY ("characterId","skillId","categoryId")
);

-- CreateTable
CREATE TABLE "wild_magic_draws" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "chosenCardId" TEXT,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wild_magic_draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wild_magic_draw_cards" (
    "drawId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "wild_magic_draw_cards_pkey" PRIMARY KEY ("drawId","cardId")
);

-- CreateTable
CREATE TABLE "class_bonus_records" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "attribute" "StatAttribute" NOT NULL,
    "classIndex" INTEGER NOT NULL,
    "rollDiceFormula" TEXT,
    "rolledValues" JSONB NOT NULL DEFAULT '[]',
    "rolledSum" INTEGER NOT NULL DEFAULT 0,
    "resultingEffect" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_bonus_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputations" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reputations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT,
    "icon" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "foodProgress" INTEGER NOT NULL DEFAULT 0,
    "statBonuses" JSONB NOT NULL DEFAULT '{}',
    "abilitySkillId" TEXT,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innate_abilities" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentRank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "innate_abilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_provider_providerAccountId_key" ON "auth_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "races_name_key" ON "races"("name");

-- CreateIndex
CREATE UNIQUE INDEX "factions_name_key" ON "factions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_name_key" ON "skill_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rule_config_key_key" ON "rule_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "backpack_slots_characterId_slotIndex_key" ON "backpack_slots"("characterId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "character_skills_characterId_skillId_key" ON "character_skills"("characterId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "class_bonus_records_characterId_attribute_classIndex_key" ON "class_bonus_records"("characterId", "attribute", "classIndex");

-- CreateIndex
CREATE UNIQUE INDEX "reputations_characterId_factionId_key" ON "reputations"("characterId", "factionId");

-- CreateIndex
CREATE UNIQUE INDEX "pets_characterId_key" ON "pets"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "innate_abilities_characterId_key" ON "innate_abilities"("characterId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wild_magic_cards" ADD CONSTRAINT "wild_magic_cards_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_template_skills" ADD CONSTRAINT "item_template_skills_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_template_skills" ADD CONSTRAINT "item_template_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_attributes" ADD CONSTRAINT "character_attributes_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runtime_states" ADD CONSTRAINT "runtime_states_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_relatedItemInstanceId_fkey" FOREIGN KEY ("relatedItemInstanceId") REFERENCES "item_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_instances" ADD CONSTRAINT "item_instances_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_instances" ADD CONSTRAINT "item_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "item_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backpack_slots" ADD CONSTRAINT "backpack_slots_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skill_tags" ADD CONSTRAINT "character_skill_tags_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skill_tags" ADD CONSTRAINT "character_skill_tags_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skill_tags" ADD CONSTRAINT "character_skill_tags_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "skill_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wild_magic_draws" ADD CONSTRAINT "wild_magic_draws_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wild_magic_draw_cards" ADD CONSTRAINT "wild_magic_draw_cards_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "wild_magic_draws"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wild_magic_draw_cards" ADD CONSTRAINT "wild_magic_draw_cards_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "wild_magic_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_bonus_records" ADD CONSTRAINT "class_bonus_records_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_abilitySkillId_fkey" FOREIGN KEY ("abilitySkillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innate_abilities" ADD CONSTRAINT "innate_abilities_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
