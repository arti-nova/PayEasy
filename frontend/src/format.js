export const money = (n, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n || 0);

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "-";