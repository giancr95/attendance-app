function pad(n: number) { return n.toString().padStart(2, "0"); }

function buildGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstDow = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: any[] = [];

  const prevLastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    const py = month === 1 ? year - 1 : year;
    const pm = month === 1 ? 12 : month - 1;
    cells.push({ dateKey: `${py}-${pad(pm)}-${pad(d)}`, dayNum: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateKey: `${year}-${pad(month)}-${pad(d)}`, dayNum: d, inMonth: true });
  }
  let nd = 1;
  while (cells.length < 42) {
    const ny = month === 12 ? year + 1 : year;
    const nm = month === 12 ? 1 : month + 1;
    cells.push({ dateKey: `${ny}-${pad(nm)}-${pad(nd)}`, dayNum: nd, inMonth: false });
    nd++;
  }
  return cells;
}

const grid = buildGrid(2026, 4); // April 2026
console.log("Mon  Mar  Mié  Jue  Vie  Sáb  Dom");
for (let row = 0; row < 6; row++) {
  const r = grid.slice(row * 7, (row + 1) * 7);
  console.log(r.map(c => c.dateKey.slice(5).padEnd(5)).join(""));
}
