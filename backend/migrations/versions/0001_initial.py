"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("player", "gm", "admin", name="account_role"), nullable=False, server_default="player"),
        sa.Column("gm_skip_confirmation", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_account_email", "account", ["email"])

    op.create_table(
        "race",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "faction",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "skill_category",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "wild_magic_card",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("effect_json", postgresql.JSONB(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "skill",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("skill_type", sa.Enum("innate", "acquired", name="skill_type_enum"), nullable=False, server_default="acquired"),
        sa.Column("occupies_slot", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("tier", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("guild_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tied_attribute", sa.String(50), nullable=True),
        sa.Column("mana_cost", sa.Integer(), nullable=True),
        sa.Column("ap_cost", sa.Integer(), nullable=True),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "rule_config",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("account.id"), nullable=True),
    )

    op.create_table(
        "campaign",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("gm_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "character",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("race_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("race.id"), nullable=True),
        sa.Column("is_npc", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaign.id"), nullable=True),
        sa.Column("appearance_image_url", sa.String(500), nullable=True),
        sa.Column("quenta", sa.Text(), nullable=True),
        sa.Column("main_quest", sa.Text(), nullable=True),
        sa.Column("quest_progress_stage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("player_notes", sa.Text(), nullable=True),
        sa.Column("unallocated_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_character_owner_id", "character", ["owner_id"])

    op.create_table(
        "character_attributes",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("strength", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("dexterity", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("intelligence", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("spirit", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("endurance", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("luck", sa.SmallInteger(), nullable=False, server_default="3"),
    )

    op.create_table(
        "derived_value",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("key", sa.Enum("hp_max", "mana_max", "ap_max", "dodge", "armor", "slots", "bubble_charges", "luck_class_crit_bonus", name="derived_value_key"), primary_key=True),
        sa.Column("computed_value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("override_value", sa.Integer(), nullable=True),
        sa.Column("manual_override", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("override_author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("account.id"), nullable=True),
        sa.Column("override_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "runtime_state",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("current_hp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_mana", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_ap", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("satiety_current", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bubble_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("bubble_persist_chance_current", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active_effects", postgresql.JSONB(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "campaign_member",
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaign.id"), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
    )
    op.create_index("ix_campaign_member_campaign_id", "campaign_member", ["campaign_id"])

    op.create_table(
        "item_template",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slot_type", sa.Enum("head", "body", "legs", "vambraces", "weapon_left", "weapon_right", "ring", "amulet", "pet", name="slot_type_enum"), nullable=False),
        sa.Column("weapon_family", sa.String(100), nullable=True),
        sa.Column("is_two_handed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("tier", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("required_attribute", sa.Enum("strength", "dexterity", "intelligence", "spirit", "endurance", "luck", name="attribute_enum"), nullable=True),
        sa.Column("damage_dice", sa.String(50), nullable=True),
        sa.Column("bonus_crit_dice", sa.String(50), nullable=True),
        sa.Column("scaling_attribute", sa.String(50), nullable=True),
        sa.Column("scaling_coefficient", sa.Numeric(6, 4), nullable=True),
        sa.Column("stat_bonuses", postgresql.JSONB(), nullable=True),
        sa.Column("granted_ability_ids", postgresql.JSONB(), nullable=True),
        sa.Column("hunger_restored", sa.Integer(), nullable=True),
        sa.Column("reference_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "item_instance",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("item_template.id"), nullable=True),
        sa.Column("overrides", postgresql.JSONB(), nullable=True),
        sa.Column("acquired_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("location", sa.String(50), nullable=False, server_default="backpack"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_item_instance_character_id", "item_instance", ["character_id"])

    op.create_table(
        "character_skill",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skill.id"), primary_key=True),
        sa.Column("acquired_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "character_skill_tag",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skill.id"), primary_key=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skill_category.id"), nullable=True),
        sa.UniqueConstraint("character_id", "skill_id", name="uq_character_skill_tag"),
    )

    op.create_table(
        "backpack_slot",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("slot_index", sa.Integer(), primary_key=True),
        sa.Column("item_name", sa.String(200), nullable=False),
        sa.Column("item_type", sa.Enum("food", "scroll", "herb", "potion", "misc", "quest", "other", name="backpack_item_type"), nullable=False, server_default="misc"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("icon_url", sa.String(500), nullable=True),
    )

    op.create_table(
        "currency",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("balance_bronze", sa.Numeric(14, 2), nullable=False, server_default="0"),
    )

    op.create_table(
        "currency_transaction",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("amount_bronze", sa.Numeric(14, 2), nullable=False),
        sa.Column("money_target", sa.String(500), nullable=False),
        sa.Column("related_item_instance_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("item_instance.id"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_currency_transaction_character_id", "currency_transaction", ["character_id", "created_at"])

    op.create_table(
        "reputation",
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), primary_key=True),
        sa.Column("faction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("faction.id"), primary_key=True),
        sa.Column("value", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "pet",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("species", sa.String(100), nullable=False),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("food_progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stat_bonuses", postgresql.JSONB(), nullable=True),
        sa.Column("ability_skill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skill.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "wild_magic_draw",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("drawn_card_ids", postgresql.JSONB(), nullable=False),
        sa.Column("chosen_card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wild_magic_card.id"), nullable=True),
        sa.Column("drawn_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "class_bonus_record",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("attribute", sa.Enum("strength", "dexterity", "intelligence", "spirit", "endurance", "luck", name="class_bonus_attr"), nullable=False),
        sa.Column("class_index", sa.Integer(), nullable=False),
        sa.Column("dice_formula", sa.String(50), nullable=True),
        sa.Column("rolled_values", postgresql.JSONB(), nullable=True),
        sa.Column("rolled_sum", sa.Integer(), nullable=True),
        sa.Column("resulting_effect", postgresql.JSONB(), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("wild_magic_draw_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("wild_magic_draw.id"), nullable=True),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("character.id"), nullable=False),
        sa.Column("action_type", sa.Enum(
            "attribute_allocated", "attribute_overridden", "override_reset", "points_granted",
            "equipment_changed", "skill_added", "skill_removed", "currency_transaction",
            "reputation_changed", "class_bonus_applied", "pet_fed", "location_transition", "bubble_hit",
            name="audit_action_type"
        ), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_log_character_id", "audit_log", ["character_id", "created_at"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("class_bonus_record")
    op.drop_table("wild_magic_draw")
    op.drop_table("pet")
    op.drop_table("reputation")
    op.drop_table("currency_transaction")
    op.drop_table("currency")
    op.drop_table("backpack_slot")
    op.drop_table("character_skill_tag")
    op.drop_table("character_skill")
    op.drop_table("item_instance")
    op.drop_table("item_template")
    op.drop_table("campaign_member")
    op.drop_table("runtime_state")
    op.drop_table("derived_value")
    op.drop_table("character_attributes")
    op.drop_table("character")
    op.drop_table("campaign")
    op.drop_table("rule_config")
    op.drop_table("skill")
    op.drop_table("wild_magic_card")
    op.drop_table("skill_category")
    op.drop_table("faction")
    op.drop_table("race")
    op.drop_table("account")
    op.execute("DROP TYPE IF EXISTS account_role")
    op.execute("DROP TYPE IF EXISTS skill_type_enum")
    op.execute("DROP TYPE IF EXISTS slot_type_enum")
    op.execute("DROP TYPE IF EXISTS attribute_enum")
    op.execute("DROP TYPE IF EXISTS derived_value_key")
    op.execute("DROP TYPE IF EXISTS backpack_item_type")
    op.execute("DROP TYPE IF EXISTS class_bonus_attr")
    op.execute("DROP TYPE IF EXISTS audit_action_type")
