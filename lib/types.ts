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
