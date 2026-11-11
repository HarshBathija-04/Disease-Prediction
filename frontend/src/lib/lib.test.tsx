import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, tokens } from "./api";
import { confidenceBand, formatDate, formatTime, initials } from "./format";
import { Markdown, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("groups headings, bullets and paragraphs", () => {
    const blocks = parseMarkdown(
      "### What it is\nA common **skin** issue\nthat spreads.\n- Keep dry\n* Avoid sharing towels\n\nSee a doctor.",
    );
    expect(blocks).toEqual([
      { type: "h", text: "What it is" },
      { type: "p", text: "A common **skin** issue that spreads." },
      { type: "ul", items: ["Keep dry", "Avoid sharing towels"] },
      { type: "p", text: "See a doctor." },
    ]);
  });

  it("renders bold text without injecting HTML", () => {
    render(<Markdown source={"Use **cool** water <img src=x onerror=alert(1)>"} />);
    expect(screen.getByText("cool").tagName).toBe("STRONG");
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("format helpers", () => {
  it("bands confidence", () => {
    expect(confidenceBand(92).label).toBe("Strong match");
    expect(confidenceBand(60).tone).toBe("warn");
    expect(confidenceBand(20).tone).toBe("muted");
  });

  it("formats plain dates without timezone drift", () => {
    expect(formatDate("2024-03-01", { day: "numeric", month: "short" })).toMatch(/1 Mar/);
  });

  it("adds the date to chat times from other days", () => {
    expect(formatTime("2024-03-01T10:00:00Z")).toMatch(/Mar/);
  });

  it("builds initials", () => {
    expect(initials("Ananya  Mehta")).toBe("AM");
  });
});

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    tokens.set(null);
  });

  it("turns the JSON error envelope into an ApiError with field details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Some fields are invalid.",
            details: { email: ["Taken."] },
          },
        }),
        { status: 400 },
      ),
    );
    const error = (await api("/api/auth/register", { method: "POST", body: {} }).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("validation_error");
    expect(error.field("email")).toBe("Taken.");
  });

  it("sends the bearer token and parses JSON", async () => {
    tokens.set({ access: "abc", refresh: "def" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: 1 })));
    await expect(api<{ ok: number }>("/api/auth/me")).resolves.toEqual({ ok: 1 });
    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer abc");
  });

  it("reports network failures with a friendly message", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api("/health")).rejects.toMatchObject({ code: "network" });
  });
});
