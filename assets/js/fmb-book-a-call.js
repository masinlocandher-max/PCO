(() => {
  "use strict";
  const picker = document.querySelector("#call-picker");
  const grid = document.querySelector("#call-days");
  const monthHeading = document.querySelector("#call-month");
  const prev = document.querySelector("#call-prev");
  const next = document.querySelector("#call-next");
  const selection = document.querySelector("#call-selection");
  const request = document.querySelector("#call-request");
  const time = document.querySelector("#call-time");
  const email = document.querySelector("#call-email");
  const monthFormat = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
  const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "UTC" });
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat("en-PH", {
    year: "numeric", month: "numeric", day: "numeric", timeZone: "Asia/Manila"
  }).formatToParts().map(({ type, value }) => [type, value]));
  // UTC is only a stable representation of Philippine calendar dates here.
  const today = epoch(Number(todayParts.year), Number(todayParts.month) - 1, Number(todayParts.day));
  const firstMonth = epoch(new Date(today).getUTCFullYear(), new Date(today).getUTCMonth(), 1);
  const lastMonth = shiftMonth(firstMonth, 12);
  const lastDate = shiftMonth(firstMonth, 13) - 86400000;
  let month = firstMonth;
  let active = today;
  let selected = null;
  function epoch(year, monthNumber, day) { return Date.UTC(year, monthNumber, day); }
  function shiftMonth(value, amount) {
    const d = new Date(value);
    return epoch(d.getUTCFullYear(), d.getUTCMonth() + amount, 1);
  }
  function chooseFocus(date) {
    active = Math.min(lastDate, Math.max(today, date));
    month = shiftMonth(active, 0);
    render(true);
  }
  function render(focusDay = false) {
    const d = new Date(month);
    monthHeading.textContent = monthFormat.format(d);
    prev.disabled = month === firstMonth;
    next.disabled = month === lastMonth;
    const offset = (d.getUTCDay() + 6) % 7;
    const lastDay = new Date(shiftMonth(month, 1) - 86400000).getUTCDate();
    const cells = document.createDocumentFragment();
    for (let i = 0; i < offset; i += 1) cells.append(document.createElement("span"));
    for (let day = 1; day <= lastDay; day += 1) {
      const date = epoch(d.getUTCFullYear(), d.getUTCMonth(), day);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.date = date;
      button.textContent = day;
      button.setAttribute("aria-label", dateFormat.format(date));
      button.setAttribute("aria-pressed", String(date === selected));
      if (date === today) button.setAttribute("aria-current", "date");
      button.disabled = date < today;
      button.tabIndex = date === active ? 0 : -1;
      cells.append(button);
    }
    grid.replaceChildren(cells);
    if (focusDay) grid.querySelector('[tabindex="0"]')?.focus();
  }
  function moveMonth(amount, control, otherControl) {
    month = shiftMonth(month, amount);
    active = Math.max(today, month);
    render();
    if (control.disabled) otherControl.focus();
  }
  function updateDraft() {
    if (selected === null) return;
    const [hours, minutes] = time.value.split(":");
    const hour = Number(hours);
    const preferredTime = /^[0-9]{2}:[0-9]{2}$/.test(time.value)
      ? `${hour % 12 || 12}:${minutes} ${hour < 12 ? "AM" : "PM"}` : "Flexible";
    const body = [
      "Hi Francine,",
      "",
      "I’d like to request an introductory call.",
      `Preferred date: ${dateFormat.format(selected)}`,
      `Preferred time: ${preferredTime} (Philippine time, UTC+8)`,
      "",
      "A short note about my project:",
      "",
      "Please let me know if this works for you, or suggest another time.",
    ].join("\r\n");
    email.href = `mailto:withlovefmb@gmail.com?subject=${encodeURIComponent("Introductory call request")}&body=${encodeURIComponent(body)}`;
  }
  prev.addEventListener("click", () => moveMonth(-1, prev, next));
  next.addEventListener("click", () => moveMonth(1, next, prev));
  grid.addEventListener("click", ({ target }) => {
    const button = target.closest("button[data-date]");
    if (!button || button.disabled) return;
    selected = Number(button.dataset.date);
    active = selected;
    selection.textContent = `Preferred date: ${dateFormat.format(selected)}.`;
    request.hidden = false;
    render(true);
    updateDraft();
  });
  grid.addEventListener("keydown", (event) => {
    const button = event.target.closest("button[data-date]");
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!button || !delta) return;
    event.preventDefault();
    chooseFocus(Number(button.dataset.date) + delta * 86400000);
  });
  time.addEventListener("input", updateDraft);
  render();
  picker.hidden = false;
})();
