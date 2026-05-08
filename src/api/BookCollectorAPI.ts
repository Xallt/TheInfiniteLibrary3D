import { githubOwner, githubRepo } from "../config";

export interface BookPDFSource {
  title: string;
  author: string | null;
  pdf_path: string;
}

export type BookCollectorSource = "guy_books";

interface GitTreeItem {
  path: string;
  type: "blob" | "tree" | "commit";
}

interface GitTreeResponse {
  tree: GitTreeItem[];
  truncated: boolean;
}

export async function fetchBooks(_source: BookCollectorSource): Promise<BookPDFSource[]> {
  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/trees/HEAD?recursive=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data: GitTreeResponse = await response.json();

  if (data.truncated) {
    throw new Error("GitHub tree response was truncated — results would be incomplete");
  }

  return data.tree
    .filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".pdf"))
    .map((item) => {
      const filename = item.path.split("/").pop() ?? item.path;
      return {
        title: filename.replace(/\.pdf$/i, ""),
        author: null,
        pdf_path: `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/HEAD/${item.path}`,
      };
    });
}
