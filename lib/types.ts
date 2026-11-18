export type ProjectKind = "link" | "files";
export type UserRole = "student" | "admin";
export type ProjectStatus = "pending" | "approved" | "rejected";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type ProjectCard = {
  id: string;
  title: string;
  description: string;
  kind: ProjectKind;
  url: string | null;
  coverImage: string | null;
  authorName: string;
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

export type ProjectDraft =
  | {
      kind: "link";
      title: string;
      description: string;
      url: string;
      coverImage: string | null;
    }
  | {
      kind: "files";
      title: string;
      description: string;
      files: ProjectSourceFile[];
      coverImage: string | null;
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
    };
