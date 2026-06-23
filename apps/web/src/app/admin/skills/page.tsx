import { prisma } from "@gob/db";
import { SkillsManager } from "./skills-manager";

export default async function AdminSkillsPage() {
  const skills = await prisma.skill.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] });
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Скиллы</h1>
      <SkillsManager skills={skills} />
    </div>
  );
}
