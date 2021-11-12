import { useQuery, UseQueryOptions } from "react-query";
import { components } from "@octokit/openapi-types";
import { Buffer } from "buffer";

export interface RepoContext {
  repo: string;
  owner: string;
}

export interface UseFileContentParams extends RepoContext {
  path: string;
  fileRef?: string;
}

export interface UseFolderContentParams extends RepoContext {
  path: string;
  fileRef?: string;
}

export type DirectoryItem = components["schemas"]["content-directory"][number];
export type TreeItem = components["schemas"]["git-tree"]["tree"][number];

function convertContentToString(d: DirectoryItem) {
  return {
    ...d,
    content: Buffer.from(d.content ? d.content : "", "base64").toString(),
  };
}

async function getFolderContent(
  params: UseFolderContentParams
): Promise<FolderData> {
  const { repo, owner, path, fileRef } = params;
  let branch = fileRef || "HEAD";

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  const res = await fetch(apiUrl, {
    headers: {
      Accept: `Bearer ${PAT}`,
    },
  });
  const { tree: rawTree } = await res.json();

  const files = (rawTree as TreeItem[]).filter((item) => {
    return item.path?.includes(path);
  });

  const tree = files.map((item) => {
    return {
      path: item.path || "",
      mode: item.mode || "",
      type: item.type || "",
      sha: item.sha || "",
      size: item.size || 0,
      url: item.url || "",
    }
  })

  const context = {
    download_url: apiUrl,
    folder: path.split("/").pop() || "",
    path: path,
    repo: repo,
    owner: owner,
    sha: branch,
    username: "mona",
  }

  return {
    tree,
    context
  }
}

const PAT = import.meta.env.VITE_GITHUB_PAT
async function getFileContent(
  params: UseFileContentParams
): Promise<FileData> {
  const { repo, owner, path, fileRef } = params;

  // const apiUrl = `https://github.com/${owner}/${repo}/raw/HEAD/${path}`;
  // const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${fileRef}`;

  const apiUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${fileRef}/${path}`
  const res = await fetch(apiUrl, {
    headers: {
      Accept: `Bearer ${PAT}`,
    },
  });

  if (res.status !== 200) throw new Error("Something bad happened");

  const content = await res.text();

  const context = {
    download_url: apiUrl,
    file: path.split("/").pop() || "",
    path: path,
    repo: repo,
    owner: owner,
    sha: fileRef || "",
    username: "mona",
  }

  return {
    content,
    context
  }
}

export function useFileContent(
  params: UseFileContentParams,
  config?: UseQueryOptions<FileData>
) {
  const { repo, owner, path, fileRef } = params;

  return useQuery(
    ["file", params],
    () =>
      getFileContent({
        repo,
        owner,
        path,
        fileRef,
      }),
    // @ts-ignore
    {
      ...config,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
}

export function useFolderContent(
  params: UseFolderContentParams,
  config?: UseQueryOptions<FolderData>
) {
  const { repo, owner, path, fileRef } = params;

  return useQuery(
    ["folder", params],
    () =>
      getFolderContent({
        repo,
        owner,
        path,
        fileRef,
      }),
    // @ts-ignore
    {
      ...config,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
}

export function usePackageJson() {
  return useQuery("package", () => import("../../package.json"), {
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function findPackageNamesInSourceCode(code: string, packageNames: string[]) {
  return packageNames.filter((pkg) => code.includes(pkg));
}

function separatePathFromFile(path: string) {
  const parts = path.split("/");
  const file = parts.pop();
  const dir = parts.join("/");
  return { file, dir };
}

export function useRawImportSource(viewer: string, dependencies: object) {
  return useQuery(
    viewer,
    async () => {
      const { dir, file } = separatePathFromFile(viewer);
      if (!file) throw new Error("No viewer file found");

      const literallyEverything = await import.meta.glob(`/src/**/*`);

      const relevantFilePaths = Object.keys(literallyEverything).filter(
        (f) => f.includes(dir.replace("./", "")) && !f.endsWith(file)
      );

      const viewerSource = await import(/* @vite-ignore */ `../${viewer}?raw`);

      const relevantFileSources = await Promise.all(
        relevantFilePaths.map(async (p) => {
          const importType = p.endsWith(".css") ? "inline" : "raw";

          return {
            path: p,

            source: await import(/* @vite-ignore */ `${p}?${importType}`),
          };
        })
      );

      const packageNames = Object.keys(dependencies);

      const helperPackages = relevantFileSources.flatMap((file) =>
        findPackageNamesInSourceCode(file.source.default, packageNames)
      );

      const entryPackages = findPackageNamesInSourceCode(
        viewerSource.default,
        packageNames
      );

      const allPackages = new Set([...helperPackages, ...entryPackages]);

      return {
        source: viewerSource.default,
        files: relevantFileSources.reduce<Record<string, string>>(
          (acc, next) => {
            const { file } = separatePathFromFile(next.path);
            acc[`/${file as string}`] = next.source.default;
            return acc;
          },
          {}
        ),
        dependencies: Array.from(allPackages).reduce<Record<string, string>>(
          (acc, next) => {
            // @ts-ignore
            acc[next] = dependencies[next];
            return acc;
          },
          {}
        ),
      };
    },
    {
      keepPreviousData: false,
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0,
    }
  );
}
