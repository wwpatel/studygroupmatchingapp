// Complementary group matching: a greedy max-coverage heuristic.
//
// Unlike similarity clustering (grouping students who score alike), this
// assigns each student to whichever forming group most benefits from their
// specific profile — i.e. the group where they cover topics its current
// members are weakest in. Students with the clearest strengths/weaknesses
// are placed first since they carry the strongest complementary signal.

export interface StudentVector {
  studentId: string;
  name: string;
  vector: Record<string, number>; // topicId -> mastery_score (0-100)
}

export function formComplementaryGroups(
  students: StudentVector[],
  topicIds: string[],
  targetGroupSize = 4,
): string[][] {
  if (students.length === 0) return [];
  if (students.length <= targetGroupSize) return [students.map((s) => s.studentId)];

  const numGroups = Math.max(1, Math.round(students.length / targetGroupSize));
  const maxSize = Math.ceil(students.length / numGroups);
  const groups: StudentVector[][] = Array.from({ length: numGroups }, () => []);

  const ordered = [...students].sort(
    (a, b) => spread(b, topicIds) - spread(a, topicIds),
  );

  for (const student of ordered) {
    let bestGroupIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].length >= maxSize) continue;
      const score =
        groups[i].length === 0
          ? -groups[i].length // prefer filling emptier groups first when no signal yet
          : complementarityScore(student, groups[i], topicIds);
      if (score > bestScore) {
        bestScore = score;
        bestGroupIndex = i;
      }
    }
    groups[bestGroupIndex].push(student);
  }

  return groups.filter((g) => g.length > 0).map((g) => g.map((s) => s.studentId));
}

function spread(student: StudentVector, topicIds: string[]): number {
  const values = topicIds.map((t) => student.vector[t] ?? 50);
  return Math.max(...values, 0) - Math.min(...values, 100);
}

function complementarityScore(
  student: StudentVector,
  group: StudentVector[],
  topicIds: string[],
): number {
  let score = 0;
  for (const topic of topicIds) {
    const groupBest = Math.max(...group.map((s) => s.vector[topic] ?? 50));
    const studentScore = student.vector[topic] ?? 50;
    // Reward covering a topic the group is currently weakest in.
    score += Math.max(0, studentScore - groupBest);
  }
  return score;
}

export function topicSummary(
  vector: Record<string, number>,
  topicNames: Record<string, string>,
  count = 3,
): { strengths: { topic: string; masteryScore: number }[]; growthAreas: { topic: string; masteryScore: number }[] } {
  const entries = Object.entries(vector)
    .filter(([id]) => topicNames[id])
    .map(([id, score]) => ({ topic: topicNames[id], masteryScore: score }));
  const sorted = [...entries].sort((a, b) => b.masteryScore - a.masteryScore);
  return {
    strengths: sorted.slice(0, count),
    growthAreas: sorted.slice(-count).reverse(),
  };
}
