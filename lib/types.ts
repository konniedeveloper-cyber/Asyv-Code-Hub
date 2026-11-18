export type ProjectKind = "link" | "files";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type ProjectCard = {
  id: string;
  title: string;
  description: string;
  kind: ProjectKind;
  url: string | null;
  authorName: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

export type ProjectDetail = ProjectCard & {
  url: string | null;
};

export type ProjectDraft =
  | {
      kind: "link";
      title: string;
      description: string;
      url: string;
    }
  | {
      kind: "files";
      title: string;
      description: string;
      html: string;
      css: string;
      js: string;
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
