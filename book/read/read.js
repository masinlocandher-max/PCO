"use strict";
const endpoint = "https://wjnavdpppnhxbuydkrkd.supabase.co/functions/v1/book-public-reader";
const get = (id) => document.getElementById(id);
const contents = get("contents"), chapter = get("chapter"), prose = get("prose"), status = get("status");
let catalog = [], current = -1, generation = 0, pending;
async function request(body, signal) {
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal });
  if (!response.ok) throw new Error("Reader unavailable");
  return response.json();
}
async function openChapter(index, focus) {
  if (!catalog[index]) return;
  get("retry").hidden = true;
  const ticket = ++generation;
  pending?.abort();
  pending = new AbortController();
  chapter.hidden = get("paging").hidden = true;
  prose.replaceChildren();
  status.textContent = "Opening chapter…";
  try {
    const row = await request({ action: "chapter", sequence: catalog[index].sequence }, pending.signal);
    if (ticket !== generation) return;
    if (typeof row?.chapter?.body !== "string" || row.chapter.sequence !== catalog[index].sequence) throw new Error("Chapter unavailable");
    get("heading").textContent = catalog[index].title;
    const paragraphs = row.chapter.body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    if (!paragraphs.length) throw new Error("Chapter unavailable");
    prose.replaceChildren(...paragraphs.map((part) => Object.assign(document.createElement("p"), { textContent: part })));
    current = contents.selectedIndex = index;
    try { localStorage.setItem("trwtl.public.sequence", String(row.chapter.sequence)); } catch {}
    get("previous").disabled = index === 0;
    get("next").disabled = index === catalog.length - 1;
    chapter.hidden = get("paging").hidden = false;
    status.textContent = "Chapter " + (index + 1) + " of " + catalog.length;
    if (focus) { get("heading").focus({preventScroll:true}); chapter.scrollIntoView({block:"start"}); }
  } catch {
    if (ticket === generation) retry("This chapter could not open. Check your connection and try again.", () => openChapter(index, focus));
  }
}
function retry(message, handler) {
  status.textContent = message;
  const button = get("retry");
  button.hidden = false;
  button.onclick = handler;
}
async function start() {
  status.textContent = "Opening the ebook…";
  get("retry").hidden = true;
  try {
    const response = await request({ action: "contents" }, AbortSignal.timeout(12000));
    if (!Array.isArray(response?.chapters) || !response.chapters.length) throw new Error("Missing table of contents");
    catalog = response.chapters;
    contents.replaceChildren(...catalog.map((row) => new Option(row.title, row.sequence)));
    get("controls").hidden = false;
    let saved = 0;
    try { saved = Number(localStorage.getItem("trwtl.public.sequence")); } catch {}
    await openChapter(Math.max(0, catalog.findIndex((row) => row.sequence === saved)), false);
  } catch {
    retry("The ebook is temporarily unavailable. Please try again.", start);
  }
}
contents.addEventListener("change", () => openChapter(contents.selectedIndex, true));
get("previous").onclick = () => openChapter(current - 1, true);
get("next").onclick = () => openChapter(current + 1, true);
function selectionIncludesChapter() {
  const selection = window.getSelection();
  return selection && !selection.isCollapsed && selection.rangeCount > 0 && selection.getRangeAt(0).intersectsNode(chapter);
}
for (const name of ["copy","cut","dragstart"]) {
  document.addEventListener(name, (event) => {
    if (!chapter.contains(event.target) && !selectionIncludesChapter()) return;
    event.preventDefault();
    if (name === "copy") status.textContent = "Copying the chapter is disabled in this reader.";
  });
}
start();
