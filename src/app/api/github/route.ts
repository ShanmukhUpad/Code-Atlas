import { fetchRepo } from "@/lib/github/fetch";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let url: string;
  try {
    const body = (await request.json()) as { url?: string };
    url = body.url ?? "";
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!url.trim())
    return Response.json({ error: "Please provide a repo URL" }, { status: 400 });

  try {
    const result = await fetchRepo(url);
    if (result.files.length === 0) {
      return Response.json(
        { error: "No JS/TS files found in that repository." },
        { status: 422 },
      );
    }
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch repository.";
    return Response.json({ error: message }, { status: 502 });
  }
}
