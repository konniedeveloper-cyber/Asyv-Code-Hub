export type ProjectKind = "link" | "files";
export type UserRole = "student" | "admin";
export type ProjectStatus = "pending" | "approved" | "rejected";
export const STUDENT_FAMILIES = [
  "Alfred Nobel Family",
  "Pele Family",
  "Rugirangoga Family",
] as const;
export const STUDENT_GRADES = ["Ijabo", "Ingabo", "Ingabe"] as const;
export type StudentFamily = (typeof STUDENT_FAMILIES)[number];
export type StudentGrade = (typeof STUDENT_GRADES)[number];

export const PROJECT_TECHNOLOGY_OPTIONS = {
  frameworks: [
    "Angular",
    "ASP.NET Core",
    "Astro",
    "Bootstrap",
    "Django",
    "Express.js",
    "FastAPI",
    "Flask",
    "Flutter",
    "Laravel",
    "Material UI",
    "Next.js",
    "NestJS",
    "Nuxt",
    "React",
    "React Native",
    "Ruby on Rails",
    "Spring Boot",
    "Svelte",
    "SvelteKit",
    "Symfony",
    "Vue.js",
    "WordPress",
  ],
  programmingLanguages: [
    "C",
    "C#",
    "C++",
    "Dart",
    "Go",
    "HTML",
    "Java",
    "JavaScript",
    "Kotlin",
    "PHP",
    "Python",
    "Ruby",
    "Rust",
    "SQL",
    "Swift",
    "TypeScript",
  ],
  stylingLanguages: ["CSS", "Less", "Sass", "SCSS", "Stylus", "Tailwind CSS"],
  databases: [
    "DynamoDB",
    "Firebase Firestore",
    "MariaDB",
    "MongoDB",
    "MySQL",
    "Oracle Database",
    "PostgreSQL",
    "Redis",
    "SQLite",
    "Supabase",
  ],
} as const;

export type ProjectTechnologyCategory = keyof typeof PROJECT_TECHNOLOGY_OPTIONS;
export type ProjectTechnologies = Record<ProjectTechnologyCategory, string[]>;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage: string | null;
  family: StudentFamily | null;
  grade: StudentGrade | null;
};

export type NotificationType =
  | "project-approved"
  | "project-rejected"
  | "project-deleted";

export type UserNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type ProjectCard = {
  id: string;
  title: string;
  description: string;
  kind: ProjectKind;
  url: string | null;
  coverImage: string | null;
  authorName: string;
  authorFamily: StudentFamily | null;
  authorGrade: StudentGrade | null;
  language: string;
  technologies: ProjectTechnologies;
  githubUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

export type ProjectDetail = ProjectCard & {
  url: string | null;
};

export type ProjectManagementItem = {
  id: string;
  title: string;
  description: string;
  kind: ProjectKind;
  url: string | null;
  coverImage: string | null;
  authorName: string;
  authorFamily: StudentFamily | null;
  authorGrade: StudentGrade | null;
  language: string;
  technologies: ProjectTechnologies;
  githubUrl: string | null;
  status: ProjectStatus;
  reviewReason: string | null;
  createdAt: string;
};

export type AdminStudent = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type ProjectSourceFile = {
  name: string;
  content: string;
};

type ProjectDraftDetails = {
  title: string;
  description: string;
  language: string;
  technologies: ProjectTechnologies;
  githubUrl: string | null;
  coverImage: string | null;
};

export type ProjectDraft = ProjectDraftDetails &
  (
    | {
        kind: "link";
        url: string;
      }
    | {
        kind: "files";
        files: ProjectSourceFile[];
      }
  );

export type EditableProject = ProjectDraft & {
  id: string;
};

export type Credentials =
  | {
      mode: "login";
      email: string;
      password: string;
    }
  | {
      mode: "register";
      name: string;
      email: string;
      password: string;
      family: StudentFamily | null;
      grade: StudentGrade | null;
    };
