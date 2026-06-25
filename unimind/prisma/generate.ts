/**
 * One-time script to generate COMP1521 course data and questions via Claude.
 * Run with: npm run db:generate-data
 * Output: prisma/initial_data.json (overwrites existing)
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Course ──────────────────────────────────────────────────────────────────

const COURSE = {
  id: "course_comp1521",
  name: "COMP1521 Computer Systems Fundamentals",
  description:
    "Introduces how computer systems are structured — covering MIPS assembly, integer and floating point representations, file systems, and concurrency.",
  startDate: "2026-06-01T00:00:00.000Z",
  color: "#00d4ff",
  icon: "cpu",
};

// ─── Topics ──────────────────────────────────────────────────────────────────

const TOPICS = [
  {
    id: "topic_w1",
    name: "MIPS Basics",
    weekNumber: 1,
    courseId: COURSE.id,
    description:
      "Introduction to MIPS assembly: registers, basic arithmetic instructions, syscalls, and simple sequential programs.",
  },
  {
    id: "topic_w2",
    name: "MIPS Control Flow",
    weekNumber: 2,
    courseId: COURSE.id,
    description:
      "Branching, jumping, labels, and translating C if/else and loops into MIPS assembly.",
  },
  {
    id: "topic_w3",
    name: "MIPS Functions & Memory",
    weekNumber: 3,
    courseId: COURSE.id,
    description:
      "Functions, calling conventions, the stack, load/store instructions, arrays in MIPS, and recursion.",
  },
  {
    id: "topic_w4a",
    name: "Integer Representations",
    weekNumber: 4,
    courseId: COURSE.id,
    description:
      "Binary, hexadecimal, unsigned integers, two's complement signed integers, and integer overflow.",
  },
  {
    id: "topic_w4b",
    name: "Bit Manipulation",
    weekNumber: 4,
    courseId: COURSE.id,
    description:
      "Bitwise operations (AND, OR, XOR, NOT), left/right shifts, bit masks, and practical applications.",
  },
  {
    id: "topic_w5",
    name: "Floating Point Representation",
    weekNumber: 5,
    courseId: COURSE.id,
    description:
      "IEEE-754 standard, sign/exponent/mantissa breakdown, special values, and floating point precision.",
  },
  {
    id: "topic_w78",
    name: "File Systems & I/O",
    weekNumber: 7,
    courseId: COURSE.id,
    description:
      "File system structure, C file I/O system calls, file metadata, directory traversal, and UTF-8 encoding.",
  },
  {
    id: "topic_w910",
    name: "Concurrency & Processes",
    weekNumber: 9,
    courseId: COURSE.id,
    description:
      "Processes, fork/exec, process synchronisation with wait(), pthreads, and mutual exclusion.",
  },
];

// ─── Subtopics ────────────────────────────────────────────────────────────────

const SUBTOPICS = [
  // Week 1 — MIPS Basics
  { id: "st_w1_01", topicId: "topic_w1", name: "MIPS Registers", description: "The MIPS register file: $t0-$t9 (temporaries), $s0-$s7 (saved), $zero, $v0, $a0-$a3, $ra, $sp." },
  { id: "st_w1_02", topicId: "topic_w1", name: "Basic Arithmetic Instructions", description: "li, move, add, sub, addi, mul and simple arithmetic in MIPS." },
  { id: "st_w1_03", topicId: "topic_w1", name: "Syscalls", description: "Using syscalls in MIPS: print_int ($v0=1), print_string ($v0=4), read_int ($v0=5), exit ($v0=10)." },
  { id: "st_w1_04", topicId: "topic_w1", name: "Sequential Programs", description: "Writing complete sequential MIPS programs with .data and .text sections." },

  // Week 2 — MIPS Control Flow
  { id: "st_w2_01", topicId: "topic_w2", name: "Branch Instructions", description: "beq, bne, blt, bgt, ble, bge — conditional branching in MIPS." },
  { id: "st_w2_02", topicId: "topic_w2", name: "Jump Instructions & Labels", description: "j (unconditional jump), jal (jump and link), jr (jump register), and defining labels." },
  { id: "st_w2_03", topicId: "topic_w2", name: "If/Else in MIPS", description: "Translating C if/else statements into MIPS assembly using branches and labels." },
  { id: "st_w2_04", topicId: "topic_w2", name: "Loops in MIPS", description: "Translating while and for loops into MIPS assembly." },
  { id: "st_w2_05", topicId: "topic_w2", name: "Set Less Than (slt)", description: "slt and slti instructions for comparisons not covered by branch mnemonics." },

  // Week 3 — MIPS Functions & Memory
  { id: "st_w3_01", topicId: "topic_w3", name: "Functions with jal/jr", description: "Calling functions with jal and returning with jr $ra." },
  { id: "st_w3_02", topicId: "topic_w3", name: "Calling Conventions", description: "Passing arguments in $a0-$a3 and returning values in $v0-$v1." },
  { id: "st_w3_03", topicId: "topic_w3", name: "The Stack & Stack Frames", description: "$sp register, push/pop using addiu $sp and sw/lw, and stack frame layout." },
  { id: "st_w3_04", topicId: "topic_w3", name: "Load & Store Instructions", description: "lw, sw (word), lb, sb (byte), lh, sh (halfword) — reading and writing memory." },
  { id: "st_w3_05", topicId: "topic_w3", name: "Arrays in MIPS", description: "Accessing array elements using base address + offset: la, lw with offset($reg)." },
  { id: "st_w3_06", topicId: "topic_w3", name: "Recursive Functions", description: "Implementing recursion in MIPS by saving $ra and arguments on the stack." },

  // Week 4 — Integer Representations
  { id: "st_w4a_01", topicId: "topic_w4a", name: "Binary & Hexadecimal", description: "Binary (base-2) and hexadecimal (base-16) number systems and converting between them." },
  { id: "st_w4a_02", topicId: "topic_w4a", name: "Unsigned Integers", description: "Unsigned integer representation and the range 0 to 2^n - 1 for n-bit values." },
  { id: "st_w4a_03", topicId: "topic_w4a", name: "Two's Complement", description: "Signed integer representation using two's complement: negating, range, and sign extension." },
  { id: "st_w4a_04", topicId: "topic_w4a", name: "Integer Overflow", description: "When overflow occurs in signed and unsigned arithmetic and its consequences." },

  // Week 4-5 — Bit Manipulation
  { id: "st_w4b_01", topicId: "topic_w4b", name: "Bitwise AND, OR, XOR, NOT", description: "The four fundamental bitwise operators: truth tables and behaviour on multi-bit values." },
  { id: "st_w4b_02", topicId: "topic_w4b", name: "Bit Shifting", description: "Left shift (<<) multiplies by powers of 2; right shift (>>) divides; logical vs arithmetic shift." },
  { id: "st_w4b_03", topicId: "topic_w4b", name: "Bit Masks & Flags", description: "Creating masks to test, set, clear, and toggle individual bits or bit fields." },
  { id: "st_w4b_04", topicId: "topic_w4b", name: "Applications of Bit Manipulation", description: "Practical uses: packing data, checking alignment, extracting fields, efficient arithmetic." },

  // Week 5 — Floating Point
  { id: "st_w5_01", topicId: "topic_w5", name: "IEEE-754 Standard", description: "The IEEE-754 floating point standard: single (32-bit) and double (64-bit) precision formats." },
  { id: "st_w5_02", topicId: "topic_w5", name: "Sign, Exponent & Mantissa", description: "Breaking a float into 1 sign bit, 8 exponent bits (biased by 127), and 23 mantissa bits." },
  { id: "st_w5_03", topicId: "topic_w5", name: "Special Values", description: "NaN, positive and negative infinity, positive and negative zero in IEEE-754." },
  { id: "st_w5_04", topicId: "topic_w5", name: "Precision & Rounding Errors", description: "Why not all real numbers are representable, rounding modes, and accumulation of errors." },

  // Week 7-8 — File Systems & I/O
  { id: "st_w78_01", topicId: "topic_w78", name: "File System Structure", description: "Inodes, directories, data blocks, and how the OS maps paths to file data." },
  { id: "st_w78_02", topicId: "topic_w78", name: "File I/O in C", description: "open(), read(), write(), close(), lseek() — POSIX file descriptor system calls." },
  { id: "st_w78_03", topicId: "topic_w78", name: "File Metadata & stat()", description: "File permissions (rwx), size, timestamps, and reading metadata with stat() and lstat()." },
  { id: "st_w78_04", topicId: "topic_w78", name: "Directory Traversal", description: "opendir(), readdir(), closedir() for iterating directory entries in C." },
  { id: "st_w78_05", topicId: "topic_w78", name: "UTF-8 Encoding", description: "How UTF-8 encodes Unicode code points using variable-length 1–4 byte sequences." },

  // Week 9-10 — Concurrency & Processes
  { id: "st_w910_01", topicId: "topic_w910", name: "Processes & fork()", description: "fork() duplicates the calling process; child vs parent via return value; process IDs." },
  { id: "st_w910_02", topicId: "topic_w910", name: "exec() Family", description: "execve(), execlp(), execvp() — replacing the process image with a new program." },
  { id: "st_w910_03", topicId: "topic_w910", name: "Process Synchronisation", description: "wait() and waitpid() for parent to wait on child exit; zombie and orphan processes." },
  { id: "st_w910_04", topicId: "topic_w910", name: "Threads with pthreads", description: "pthread_create(), pthread_join(), thread vs process; shared memory space." },
  { id: "st_w910_05", topicId: "topic_w910", name: "Mutual Exclusion & Mutexes", description: "Race conditions, pthread_mutex_lock/unlock, and why locks are needed for shared state." },
];

// ─── Assessments ─────────────────────────────────────────────────────────────

const ASSESSMENTS = [
  {
    id: "assess_a1",
    name: "Assignment 1",
    courseId: COURSE.id,
    date: "2026-07-05T23:59:00.000Z",
    description: "MIPS assembly programming (15%). Covers Weeks 1–3 content.",
  },
  {
    id: "assess_a2",
    name: "Assignment 2",
    courseId: COURSE.id,
    date: "2026-08-07T23:59:00.000Z",
    description: "Systems programming — file I/O and concurrency (15%). Covers Weeks 7–10.",
  },
  {
    id: "assess_exam",
    name: "Final Exam",
    courseId: COURSE.id,
    date: "2026-08-20T09:00:00.000Z",
    description: "3-hour final exam in CSE labs. Hurdle: must score ≥40% (18/45) to pass.",
  },
];

// ─── Question generation ──────────────────────────────────────────────────────

type GeneratedQuestion = {
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  difficulty: 1 | 2 | 3;
};

async function generateQuestions(
  subtopic: (typeof SUBTOPICS)[0],
  topic: (typeof TOPICS)[0],
  attempt = 1,
): Promise<GeneratedQuestion[]> {
  const prompt = `You are writing multiple choice questions for COMP1521 Computer Systems Fundamentals at UNSW Sydney.

Topic: ${topic.name}
Subtopic: ${subtopic.name}
Subtopic detail: ${subtopic.description}

Generate exactly 9 multiple choice questions — 3 at each difficulty level:
- Difficulty 1 (Easy): basic recall, definitions, identifying correct syntax or output
- Difficulty 2 (Medium): applying concepts, tracing through code/values, picking correct behaviour
- Difficulty 3 (Hard): edge cases, subtle errors, multi-step reasoning, tricky outputs

Rules:
- Each question must have exactly 4 choices
- Exactly one choice is correct (answerIndex is 0-3)
- Wrong choices should be plausible — common mistakes, not obviously wrong
- Explanation: 1-2 sentences on WHY the answer is correct
- Questions must be specific to the subtopic — not generic programming questions
- For MIPS questions, use real MIPS syntax and register names

Return ONLY a valid JSON array of exactly 9 objects. No markdown, no explanation outside the JSON.

Schema:
[
  {
    "question": "string",
    "choices": ["string", "string", "string", "string"],
    "answerIndex": 0,
    "explanation": "string",
    "difficulty": 1
  }
]`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (response.content[0] as { text: string }).text;

  // Extract the JSON array regardless of surrounding text or code fences
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in response");
  const jsonStr = raw.slice(start, end + 1);

  let questions: GeneratedQuestion[];
  try {
    questions = JSON.parse(jsonStr);
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000));
      return generateQuestions(subtopic, topic, attempt + 1);
    }
    throw err;
  }

  if (!Array.isArray(questions) || questions.length < 9) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000));
      return generateQuestions(subtopic, topic, attempt + 1);
    }
    throw new Error(`Expected at least 9 questions, got ${questions.length} for ${subtopic.name}`);
  }

  return questions.slice(0, 9);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PROGRESS_PATH = path.join(__dirname, "generate_progress.json");
const OUT_PATH = path.join(__dirname, "initial_data.json");

type Progress = { completedSubtopicIds: string[]; questions: object[] };

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_PATH)) {
    const raw = fs.readFileSync(PROGRESS_PATH, "utf-8");
    return JSON.parse(raw) as Progress;
  }
  return { completedSubtopicIds: [], questions: [] };
}

function saveProgress(progress: Progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
}

async function main() {
  console.log("🚀 Generating COMP1521 course data...\n");

  const topicMap = new Map(TOPICS.map((t) => [t.id, t]));
  const progress = loadProgress();
  const done = new Set(progress.completedSubtopicIds);
  const allQuestions = progress.questions;
  let questionIndex = allQuestions.length;

  if (done.size > 0) {
    console.log(`   Resuming from progress — ${done.size}/${SUBTOPICS.length} subtopics already done\n`);
  }

  for (const subtopic of SUBTOPICS) {
    if (done.has(subtopic.id)) {
      console.log(`  Skipping (done): ${subtopic.name}`);
      continue;
    }

    const topic = topicMap.get(subtopic.topicId)!;
    process.stdout.write(`  Generating: ${topic.name} / ${subtopic.name} ... `);

    try {
      const questions = await generateQuestions(subtopic, topic);
      for (const q of questions) {
        allQuestions.push({
          id: `q_${++questionIndex}`,
          question: q.question,
          choices: q.choices,
          answerIndex: q.answerIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
          topicId: subtopic.topicId,
          subtopicId: subtopic.id,
        });
      }
      console.log(`✓ ${questions.length} questions`);

      progress.completedSubtopicIds.push(subtopic.id);
      progress.questions = allQuestions;
      saveProgress(progress);
    } catch (err) {
      console.error(`✗ FAILED: ${err}`);
      console.error(`   Progress saved — re-run to resume from this subtopic.`);
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  const output = {
    users: [],
    userStats: [],
    userTopics: [],
    courseEnrollments: [],
    assessmentUsers: [],
    courses: [COURSE],
    topics: TOPICS,
    subtopics: SUBTOPICS,
    questions: allQuestions,
    assessments: ASSESSMENTS,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  fs.unlinkSync(PROGRESS_PATH);

  console.log(`\n✅ Done! ${allQuestions.length} questions across ${SUBTOPICS.length} subtopics`);
  console.log(`   Written to: ${OUT_PATH}`);
  console.log(`\n   Run 'npm run db:seed' to load into the database.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
