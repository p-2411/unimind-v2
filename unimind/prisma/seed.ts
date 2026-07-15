import { PrismaClient } from "../generated/prisma";
import initialDataRaw from "./initial_data.json";

const initialData = initialDataRaw as {
  courses: { id: string; name: string; description: string; color: string; icon: string; startDate: string | null; flexWeeks?: number[] }[];
  topics: { id: string; name: string; description: string; courseId: string; weekNumber?: number | null }[];
  subtopics: { id: string; name: string; description: string; topicId: string }[];
  questions: { id: string; question: string; choices: string[]; answerIndex: number; explanation: string; topicId: string; subtopicId: string; difficulty: number }[];
  assessments: { id: string; name: string; description: string; courseId: string; date: string; weekFrom?: number | null; weekTo?: number | null }[];
};

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed (upsert-only — no user data touched)...\n");

  // Seed Courses
  console.log("📚 Upserting courses...");
  for (const course of initialData.courses) {
    const data = {
      name: course.name,
      description: course.description,
      color: course.color,
      icon: course.icon,
      startDate: course.startDate ? new Date(course.startDate) : null,
      flexWeeks: course.flexWeeks ?? [],
    };
    await prisma.course.upsert({
      where: { id: course.id },
      create: { id: course.id, ...data },
      update: data,
    });
  }
  console.log(`   ✓ Upserted ${initialData.courses.length} courses`);

  // Seed Topics
  console.log("📖 Upserting topics...");
  for (const topic of initialData.topics) {
    const data = {
      name: topic.name,
      description: topic.description,
      courseId: topic.courseId,
      weekNumber: topic.weekNumber ?? null,
    };
    await prisma.topic.upsert({
      where: { id: topic.id },
      create: { id: topic.id, ...data },
      update: data,
    });
  }
  console.log(`   ✓ Upserted ${initialData.topics.length} topics`);

  // Seed Subtopics
  console.log("📑 Upserting subtopics...");
  for (const subtopic of initialData.subtopics) {
    const data = {
      name: subtopic.name,
      description: subtopic.description,
      topicId: subtopic.topicId,
    };
    await prisma.subtopic.upsert({
      where: { id: subtopic.id },
      create: { id: subtopic.id, ...data },
      update: data,
    });
  }
  console.log(`   ✓ Upserted ${initialData.subtopics.length} subtopics`);

  // Seed Questions
  console.log("❓ Upserting questions...");
  for (const question of initialData.questions) {
    const data = {
      question: question.question,
      choices: question.choices,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
      difficulty: question.difficulty,
      topicId: question.topicId,
      subtopicId: question.subtopicId,
    };
    await prisma.question.upsert({
      where: { id: question.id },
      create: { id: question.id, ...data },
      update: data,
    });
  }
  console.log(`   ✓ Upserted ${initialData.questions.length} questions`);

  // Seed Assessments
  console.log("📝 Upserting assessments...");
  for (const assessment of initialData.assessments) {
    const data = {
      name: assessment.name,
      courseId: assessment.courseId,
      date: new Date(assessment.date),
      description: assessment.description,
      weekFrom: assessment.weekFrom ?? null,
      weekTo: assessment.weekTo ?? null,
    };
    await prisma.assessment.upsert({
      where: { id: assessment.id },
      create: { id: assessment.id, ...data },
      update: data,
    });
  }
  console.log(`   ✓ Upserted ${initialData.assessments.length} assessments`);

  // ── Problems ──────────────────────────────────────────────────────────────
  console.log("🧩 Seeding exam problems...");
  const PROBLEMS = [
    {
      id: "prob_fork_output",
      slug: "fork-output-prediction",
      title: "Fork Output Prediction",
      difficulty: "medium",
      type: "code-tracing",
      courseId: "course_comp1521",
      topicId: "topic_w910",
      hints: [
        "Remember: fork() returns 0 in the child and the child's PID in the parent.",
        "After fork(), both parent and child continue from the same point in the code.",
        "Each process has its own copy of variables — changes in one don't affect the other.",
      ],
      description: `## Problem

Consider the following C program:

\`\`\`c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    int x = 1;

    pid_t pid = fork();

    if (pid == 0) {
        x = x + 1;
        printf("child: x = %d\\n", x);
    } else {
        x = x + 10;
        printf("parent: x = %d\\n", x);
        wait(NULL);
    }

    printf("done: x = %d\\n", x);
    return 0;
}
\`\`\`

**(a)** How many times does \`printf\` execute in total across all processes?

**(b)** What are all possible outputs of this program? List every valid ordering.

**(c)** Is the output deterministic? Why or why not?`,
      solution: `## Solution

**(a)** \`printf\` executes **4 times** total:
- Child: \`printf("child: x = %d\\n", x)\` → 1 call
- Child: \`printf("done: x = %d\\n", x)\` → 1 call
- Parent: \`printf("parent: x = %d\\n", x)\` → 1 call
- Parent: \`printf("done: x = %d\\n", x)\` → 1 call

**(b)** Each process has its own \`x\`. Starting value: \`x = 1\`.

- Child sets \`x = 1 + 1 = 2\`
- Parent sets \`x = 1 + 10 = 11\`

The child always prints its two lines together (they run sequentially in the child). The parent waits for the child before printing "done". So valid orderings:

**Ordering 1:**
\`\`\`
child: x = 2
done: x = 2
parent: x = 11
done: x = 11
\`\`\`

**Ordering 2:**
\`\`\`
parent: x = 11
child: x = 2
done: x = 2
done: x = 11
\`\`\`

**(c)** **Not deterministic.** The OS scheduler decides which process runs first — parent or child — after the fork. The relative order of parent and child output can vary between runs. The parent's "done" always comes last because of \`wait(NULL)\`, but the child lines can interleave with the parent's first printf.`,
    },
    {
      id: "prob_bitwise_mask",
      slug: "bitwise-masking",
      title: "Bitwise Masking",
      difficulty: "easy",
      type: "code-writing",
      courseId: "course_comp1521",
      topicId: "topic_w4b",
      hints: [
        "To extract specific bits, use AND (&) with a mask that has 1s in the positions you want.",
        "To set a bit to 1, use OR (|) with a mask that has a 1 in that position.",
        "To clear a bit to 0, use AND (&) with a mask that has a 0 in that position and 1s elsewhere (~).",
      ],
      description: `## Problem

Write three C functions that manipulate individual bits of an \`unsigned int\`.

**(a)** Write \`get_bit(unsigned int n, int pos)\` that returns the value of bit at position \`pos\` (0 = least significant). It should return 0 or 1.

**(b)** Write \`set_bit(unsigned int n, int pos)\` that returns \`n\` with bit \`pos\` set to 1.

**(c)** Write \`clear_bit(unsigned int n, int pos)\` that returns \`n\` with bit \`pos\` set to 0.

**Example:**
\`\`\`
n = 0b1010  (decimal 10)

get_bit(n, 1)   → 1  (bit 1 is set)
get_bit(n, 0)   → 0  (bit 0 is clear)
set_bit(n, 0)   → 0b1011 = 11
clear_bit(n, 3) → 0b0010 = 2
\`\`\``,
      solution: `## Solution

\`\`\`c
// (a) Extract bit at position pos
unsigned int get_bit(unsigned int n, int pos) {
    return (n >> pos) & 1;
}

// (b) Set bit at position pos to 1
unsigned int set_bit(unsigned int n, int pos) {
    return n | (1u << pos);
}

// (c) Clear bit at position pos to 0
unsigned int clear_bit(unsigned int n, int pos) {
    return n & ~(1u << pos);
}
\`\`\`

**Key ideas:**

- **get_bit**: Shift \`n\` right by \`pos\` so the target bit is at position 0, then mask with \`1\`.
- **set_bit**: Create a mask with only bit \`pos\` set (\`1u << pos\`), then OR with \`n\`. OR leaves all other bits unchanged.
- **clear_bit**: Create the same mask, invert it with \`~\` (so position \`pos\` is 0, all others are 1), then AND with \`n\`. AND with 0 clears a bit; AND with 1 preserves it.

> Use \`1u\` (unsigned literal) not \`1\` to avoid undefined behaviour when shifting into the sign bit.`,
    },
    {
      id: "prob_mips_trace",
      slug: "mips-register-trace",
      title: "MIPS Register Trace",
      difficulty: "medium",
      type: "code-tracing",
      courseId: "course_comp1521",
      topicId: "topic_w1",
      hints: [
        "MIPS registers: $t0–$t9 are temporaries, $s0–$s7 are saved.",
        "addi adds an immediate (constant) to a register.",
        "mul multiplies two registers and stores the result in a third.",
        "bne branches if the two registers are NOT equal.",
      ],
      description: `## Problem

Trace through the following MIPS assembly and determine the final value in each register.

\`\`\`mips
    addi  $t0, $zero, 3    # line 1
    addi  $t1, $zero, 0    # line 2
    addi  $t2, $zero, 1    # line 3

loop:
    beq   $t0, $zero, end  # line 4
    mul   $t1, $t1, $t0   # line 5  (note: $t1 starts at 0!)
    addi  $t1, $t1, $t2   # line 6
    addi  $t0, $t0, -1    # line 7
    j     loop             # line 8

end:
\`\`\`

Wait — there's a subtle issue on line 5. Let's fix the problem:

**Corrected version** (assume $t1 starts at 1):

\`\`\`mips
    addi  $t0, $zero, 4    # line 1
    addi  $t1, $zero, 1    # line 2

loop:
    beq   $t0, $zero, end  # line 3
    mul   $t1, $t1, $t0   # line 4
    addi  $t0, $t0, -1    # line 5
    j     loop             # line 6

end:
\`\`\`

**(a)** Fill in the register values for each iteration:

| Iteration | $t0 (before branch) | $t1 |
|-----------|---------------------|-----|
| 1 | 4 | 1 |
| 2 | ? | ? |
| 3 | ? | ? |
| 4 | ? | ? |
| exit | 0 | ? |

**(b)** What does this program compute? (Describe in one line.)

**(c)** What C code is equivalent?`,
      solution: `## Solution

**(a)** Register trace:

| Iteration | $t0 (before branch) | $t1 |
|-----------|---------------------|-----|
| 1 | 4 | 1 |
| 2 | 3 | 4 |
| 3 | 2 | 12 |
| 4 | 1 | 24 |
| exit | 0 | 24 |

Working through it:
- Iter 1: branch not taken (4 ≠ 0) → $t1 = 1 × 4 = 4, $t0 = 3
- Iter 2: branch not taken (3 ≠ 0) → $t1 = 4 × 3 = 12, $t0 = 2
- Iter 3: branch not taken (2 ≠ 0) → $t1 = 12 × 2 = 24, $t0 = 1
- Iter 4: branch not taken (1 ≠ 0) → $t1 = 24 × 1 = 24, $t0 = 0
- Next check: $t0 = 0 → branch taken → exit

**(b)** This program computes **4! (4 factorial) = 24**.

**(c)** Equivalent C:
\`\`\`c
int t0 = 4;
int t1 = 1;
while (t0 != 0) {
    t1 = t1 * t0;
    t0 = t0 - 1;
}
// t1 == 24
\`\`\``,
    },
    {
      id: "prob_virtual_memory",
      slug: "virtual-memory-page-fault",
      title: "Virtual Memory & Page Faults",
      difficulty: "hard",
      type: "short-answer",
      courseId: "course_comp1521",
      topicId: "topic_w78",
      hints: [
        "A page fault occurs when the CPU accesses a virtual address whose page is not in physical memory.",
        "The page table maps virtual page numbers (VPN) to physical frame numbers (PFN).",
        "Page size = 4 KB = 4096 bytes. A virtual address splits into VPN and page offset.",
      ],
      description: `## Problem

A system uses **32-bit virtual addresses** and a **page size of 4 KB** (4096 bytes).

**(a)** How many bits are used for the page offset? How many bits for the virtual page number (VPN)?

**(b)** A process accesses virtual address \`0x00403A10\`.

- What is the VPN (in hex)?
- What is the page offset (in hex)?

**(c)** The page table for this process shows:

| VPN | PFN | Valid |
|-----|-----|-------|
| 0x000 | 0x1A | 1 |
| 0x001 | 0x2B | 0 |
| 0x403 | 0x0F | 1 |
| 0x404 | —   | 0 |

Does accessing \`0x00403A10\` cause a page fault? If not, what is the physical address?

**(d)** What happens in the OS when a page fault occurs? Describe the steps in order.`,
      solution: `## Solution

**(a)**
- Page size = 4 KB = 2¹² bytes → **12 bits** for the page offset
- Virtual address = 32 bits → VPN = 32 − 12 = **20 bits**

**(b)** Virtual address: \`0x00403A10\`

In binary, split at bit 12:
\`\`\`
0x00403A10 = 0000 0000 0100 0000 0011 | 1010 0001 0000
                    VPN = 0x00403    |  offset = 0xA10
\`\`\`

- **VPN = 0x403**
- **Page offset = 0xA10**

**(c)** Look up VPN 0x403 in the page table → **Valid = 1, PFN = 0x0F**.

No page fault. Physical address:
\`\`\`
Physical address = (PFN << 12) | offset
                 = (0x0F << 12) | 0xA10
                 = 0x0F000 | 0xA10
                 = 0x0FA10
\`\`\`

**Physical address = 0x0FA10**

**(d)** Page fault handling steps:
1. CPU raises a page fault exception; control transfers to the OS page fault handler.
2. OS checks if the virtual address is valid (within the process's address space). If not → segfault / kill process.
3. OS finds a free physical frame (or evicts a page using a replacement algorithm like LRU).
4. If the evicted page is dirty (modified), write it back to disk (swap space).
5. OS reads the required page from disk into the free physical frame.
6. OS updates the page table entry: set PFN and Valid = 1.
7. OS returns control to the process; the faulting instruction is re-executed.`,
    },
    {
      id: "prob_stack_frame",
      slug: "stack-frame-layout",
      title: "Stack Frame Layout",
      difficulty: "easy",
      type: "diagram",
      courseId: "course_comp1521",
      topicId: "topic_w3",
      hints: [
        "The stack grows downward in memory (toward lower addresses).",
        "When a function is called: push return address, push saved registers, allocate space for locals.",
        "Parameters in MIPS are passed in $a0–$a3; excess parameters go on the stack.",
      ],
      description: `## Problem

Given the following C function:

\`\`\`c
int sum_array(int *arr, int n) {
    int total = 0;
    int i = 0;
    while (i < n) {
        total = total + arr[i];
        i = i + 1;
    }
    return total;
}
\`\`\`

**(a)** How many local variables does \`sum_array\` have? List them with their types.

**(b)** Draw the stack frame for \`sum_array\` as it would appear on a MIPS processor. Include:
- Return address slot (\$ra)
- Saved frame pointer slot (\$fp)
- Space for each local variable
- Label which direction is "higher address" vs "lower address"

**(c)** In MIPS calling convention, where are the parameters \`arr\` and \`n\` passed?

**(d)** After \`sum_array\` returns, what is the caller responsible for?`,
      solution: `## Solution

**(a)** \`sum_array\` has **2 local variables**:
- \`total\` (int)
- \`i\` (int)

Note: \`arr\` and \`n\` are parameters, not locals — though in practice they may be spilled to the stack.

**(b)** MIPS stack frame (stack grows downward = toward lower addresses):

\`\`\`
Higher addresses
┌─────────────────┐ ← $fp (frame pointer)
│   saved $ra     │  return address
├─────────────────┤
│   saved $fp     │  caller's frame pointer
├─────────────────┤
│   total         │  int (4 bytes)
├─────────────────┤
│   i             │  int (4 bytes)
└─────────────────┘ ← $sp (stack pointer)
Lower addresses
\`\`\`

Frame size = 4 × 4 bytes = 16 bytes (aligned to 8 bytes → may be padded).

**(c)** MIPS passes the first 4 arguments in registers:
- \`arr\` → **\$a0**
- \`n\` → **\$a1**

**(d)** After \`sum_array\` returns:
- The **caller** does nothing special — the callee (\`sum_array\`) restores \$sp and \$fp before returning.
- The return value is in **\$v0**.
- The caller reads \$v0 to get the result.`,
    },
  ];

  for (const p of PROBLEMS) {
    await prisma.problem.upsert({
      where: { id: p.id },
      create: p,
      update: p,
    });
  }
  console.log(`   ✓ Seeded ${PROBLEMS.length} exam problems`);

  console.log("\n✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
