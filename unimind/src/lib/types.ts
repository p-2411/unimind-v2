// ============================================
// USER TYPES
// ============================================

export type User = {
  id: string;
  email: string;
  emailVerified: Date | null;
  password: string | null;
  name: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  courses?: Course[];
  assessments?: Assessment[];
  stats?: UserStats | null;
  topics?: UserTopic[];
  accounts?: Account[];
  sessions?: Session[];
};

export type UserStats = {
  id: string;
  userId: string;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalTimeSpent: number; // in milliseconds
  level: number;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  user?: User;
};

export type UserTopic = {
  id: string;
  userId: string;
  topicId: string;
  score: number;
  updatedAt: Date;
  user?: User;
  topic?: Topic;
  // subtopics?: Subtopic[];
};

// ============================================
// COURSE STRUCTURE TYPES
// ============================================

export type Course = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  topics?: Topic[];
  users?: User[];
  assessments?: Assessment[];
};

export type Topic = {
  id: string;
  name: string;
  description: string | null;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
  course?: Course;
  // subTopics?: Subtopic[];
  questions?: Question[];
  userTopics?: UserTopic[];
};

// export type Subtopic = {
//   id: string;
//   name: string;
//   description: string | null;
//   score: number;
//   topicId: string;
//   createdAt: Date;
//   updatedAt: Date;
//   topic?: Topic;
//   questions?: Question[];
//   userTopics?: UserTopic[];
// };

// ============================================
// QUESTION TYPES
// ============================================

export type Question = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string | null;
  difficulty: number; // 1-3 scale
  topicId: string;
  createdAt: Date;
  updatedAt: Date;
  topic?: Topic;
  // subtopicId: string;
  // subtopic?: Subtopic;
};

export type Difficulty = 1 | 2 | 3;

// ============================================
// ASSESSMENT TYPES
// ============================================

export type Assessment = {
  id: string;
  name: string;
  courseId: string;
  date: Date;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  course?: Course;
  users?: User[];
};

// ============================================
// AUTHENTICATION TYPES
// ============================================

export type Account = {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  refresh_token_expires_in: number | null;
  user?: User;
};

export type Session = {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  user?: User;
};

export type VerificationToken = {
  identifier: string;
  token: string;
  expires: Date;
};

// ============================================
// INPUT/CREATE TYPES
// ============================================

export type CreateUserInput = {
  email: string;
  password?: string;
  name?: string;
  image?: string;
};

export type CreateCourseInput = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
};

export type CreateTopicInput = {
  name: string;
  description?: string;
  courseId: string;
};

// export type CreateSubtopicInput = {
//   name: string;
//   description?: string;
//   score: number;
//   topicId: string;
// };

export type CreateQuestionInput = {
  question: string;
  choices: string[];
  answerIndex: number;
  explanation?: string;
  difficulty?: Difficulty;
  topicId: string;
  // subtopicId: string;
};

export type CreateAssessmentInput = {
  name: string;
  courseId: string;
  date: Date;
  description?: string;
};

// ============================================
// UPDATE TYPES
// ============================================

export type UpdateUserInput = Partial<Omit<User, "id" | "createdAt" | "updatedAt">>;
export type UpdateCourseInput = Partial<Omit<Course, "id" | "createdAt" | "updatedAt">>;
export type UpdateTopicInput = Partial<Omit<Topic, "id" | "createdAt" | "updatedAt">>;
// export type UpdateSubtopicInput = Partial<Omit<Subtopic, "id" | "createdAt" | "updatedAt">>;
export type UpdateQuestionInput = Partial<Omit<Question, "id" | "createdAt" | "updatedAt">>;
export type UpdateAssessmentInput = Partial<Omit<Assessment, "id" | "createdAt" | "updatedAt">>;
export type UpdateUserStatsInput = Partial<Omit<UserStats, "id" | "userId">>;
export type UpdateUserTopicInput = Partial<Omit<UserTopic, "id" | "userId" | "topicId" | "updatedAt">>;
