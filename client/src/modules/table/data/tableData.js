// Fake/demo table dine-in orders removed. Table orders are now fetched from the
// backend (GET /table-sessions/:n/active-order) and saved client-side only after
// being created.
export const INITIAL_TABLE_ORDERS = [];

// Physical table layout of the cafe (real configuration, not order data).
export const AVAILABLE_TABLES = [
  { number: 1, capacity: 2, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 2, capacity: 2, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 3, capacity: 4, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 4, capacity: 4, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 5, capacity: 4, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 6, capacity: 4, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 7, capacity: 2, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 8, capacity: 6, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 9, capacity: 6, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 10, capacity: 8, section: "الصالة الداخلية - الطابق الأرضي" },
  { number: 11, capacity: 4, section: "التراس الخارجي" },
  { number: 12, capacity: 4, section: "التراس الخارجي" },
  { number: 13, capacity: 4, section: "التراس الخارجي" },
  { number: 14, capacity: 2, section: "التراس الخارجي" },
  { number: 15, capacity: 2, section: "التراس الخارجي" },
  { number: 16, capacity: 4, section: "التراس الخارجي" },
  { number: 17, capacity: 4, section: "التراس الخارجي" },
  { number: 18, capacity: 6, section: "التراس الخارجي" },
  { number: 19, capacity: 1, section: "ركن المذاكرة والعمل - صالة داخلية" },
  { number: 20, capacity: 2, section: "ركن المذاكرة والعمل - صالة داخلية" },
];