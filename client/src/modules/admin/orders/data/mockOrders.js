export const MOCK_PREPARATION_ORDERS = {
    current: {
        online: [
            { id: 501, orderNumber: "A-1015", table: null, items: [
                { name: "لاتيه", qty: 2, variant: "ساخن", size: "كبير (16 أونص)", price: 55, category: "مشروبات", notes: "حليب قليل الدسم", materials: [
                    { name: "إسبريسو / بن كولومبي", unit: "مل", qtyPerUnit: 90 },
                    { name: "حليب كامل الدسم مراعي", unit: "مل", qtyPerUnit: 240 },
                    { name: "سكر أبيض ناعم", unit: "جرام", qtyPerUnit: 15 },
                    { name: "رغوة حليب سخنة", unit: "مل", qtyPerUnit: 70 }
                ] },
                { name: "كيكة شوكولاتة", qty: 1, variant: "عادي", size: "slice", price: 40, category: "حلويات", notes: "", materials: [] }
            ], time: "12:30 ص" },
            { id: 502, orderNumber: "A-1016", table: null, items: [
                { name: "كابوتشينو", qty: 1, variant: "ساخن", size: "صغير (8 أونص)", price: 40, category: "مشروبات", notes: "", materials: [
                    { name: "إسبريسو / بن كولومبي", unit: "مل", qtyPerUnit: 30 },
                    { name: "حليب كامل الدسم مراعي", unit: "مل", qtyPerUnit: 100 },
                    { name: "رغوة كابتشينو", unit: "مل", qtyPerUnit: 50 }
                ] }
            ], time: "12:35 ص" },
            { id: 503, orderNumber: "A-1018", table: null, items: [
                { name: "برجر لحم", qty: 2, variant: "عادي", size: "عادي", price: 85, category: "أكلات", notes: "بدون بصل", materials: [
                    { name: "خبز برجر", unit: "قطعة", qtyPerUnit: 1 },
                    { name: "لحم بقر مفروم", unit: "جرام", qtyPerUnit: 200 },
                    { name: "جبنة شيدر", unit: "شريحة", qtyPerUnit: 1 },
                    { name: "خس", unit: "جرام", qtyPerUnit: 30 },
                    { name: "طماطم", unit: "شريحة", qtyPerUnit: 2 }
                ] },
                { name: "فرايز", qty: 2, variant: "عادي", size: "عادي", price: 35, category: "مقبلات", notes: "", materials: [
                    { name: "بطاطس طازجة", unit: "جرام", qtyPerUnit: 200 },
                    { name: "زيت قلي", unit: "مل", qtyPerUnit: 50 },
                    { name: "ملح", unit: "جرام", qtyPerUnit: 3 }
                ] },
                { name: "موهيتو", qty: 2, variant: "بارد", size: "كبير", price: 40, category: "مشروبات", notes: "", materials: [
                    { name: "نعناع طازج", unit: "ورقة", qtyPerUnit: 8 },
                    { name: "ليمون", unit: "مل", qtyPerUnit: 30 },
                    { name: "سكر", unit: "جرام", qtyPerUnit: 15 },
                    { name: "سода", unit: "مل", qtyPerUnit: 200 },
                    { name: "ثلج مكسر", unit: "جرام", qtyPerUnit: 150 }
                ] }
            ], time: "12:42 ص" },
        ],
        tables: [
            { id: 511, orderNumber: "T3-1", table: "طربيزة 3", items: [
                { name: "إسبريسو", qty: 4, variant: "ساخن", size: "كبير", price: 35, category: "مشروبات", notes: "", materials: [
                    { name: "إسبريسو / بن كولومبي", unit: "مل", qtyPerUnit: 60 }
                ] }
            ], time: "12:20 ص" },
            { id: 512, orderNumber: "T5-1", table: "طربيزة 5", items: [
                { name: "بيتزا سوبريم", qty: 1, variant: "عادي", size: "كبير", price: 130, category: "أكلات", notes: "", materials: [
                    { name: "عجينة بيتزا", unit: "قطعة", qtyPerUnit: 1 },
                    { name: "صلصة طماطم", unit: "مل", qtyPerUnit: 80 },
                    { name: "جبنة موزاريلا", unit: "جرام", qtyPerUnit: 150 },
                    { name: "دجاج مشوي", unit: "جرام", qtyPerUnit: 100 },
                    { name: "فلفل رومي", unit: "جرام", qtyPerUnit: 50 },
                    { name: "زيتون", unit: "جرام", qtyPerUnit: 30 }
                ] },
                { name: "سلطة", qty: 1, variant: "عادي", size: "عادي", price: 40, category: "مقبلات", notes: "", materials: [
                    { name: "خس", unit: "جرام", qtyPerUnit: 80 },
                    { name: "طماطم", unit: "جرام", qtyPerUnit: 50 },
                    { name: "خيار", unit: "جرام", qtyPerUnit: 50 },
                    { name: "زيت زيتون", unit: "مل", qtyPerUnit: 15 }
                ] }
            ], time: "12:28 ص" },
        ],
    },
    ready: {
        online: [
            { id: 521, orderNumber: "A-1012", table: null, items: [
                { name: "شاي أحمر", qty: 3, variant: "ساخن", size: "كبير", price: 20, category: "مشروبات", notes: "", materials: [
                    { name: "أكياس شاي أحمر", unit: "قطعة", qtyPerUnit: 1 },
                    { name: "ماء ساخن", unit: "مل", qtyPerUnit: 250 }
                ] },
                { name: "تيراميسو", qty: 2, variant: "عادي", size: "slice", price: 45, category: "حلويات", notes: "", materials: [] }
            ], time: "12:10 ص" },
            { id: 522, orderNumber: "A-1014", table: null, items: [
                { name: "آيس كوفي", qty: 2, variant: "بارد", size: "كبير", price: 45, category: "مشروبات", notes: "", materials: [
                    { name: "إسبريسو / بن كولومبي", unit: "مل", qtyPerUnit: 60 },
                    { name: "حليب مكثف محلى", unit: "مل", qtyPerUnit: 40 },
                    { name: "ثلج مكسر", unit: "جرام", qtyPerUnit: 120 },
                    { name: "أكواب بلاستيكية", unit: "قطعة", qtyPerUnit: 1 }
                ] },
                { name: "ناجتس دجاج", qty: 1, variant: "عادي", size: "6 قطع", price: 55, category: "مقبلات", notes: "", materials: [
                    { name: "صدر دجاج", unit: "جرام", qtyPerUnit: 150 },
                    { name: "بقسماط", unit: "جرام", qtyPerUnit: 50 },
                    { name: "زيت قلي", unit: "مل", qtyPerUnit: 100 }
                ] }
            ], time: "12:18 ص" },
        ],
        tables: [
            { id: 523, orderNumber: "T2-1", table: "طربيزة 2", items: [
                { name: "ساندويتش شاورما", qty: 2, variant: "دجاج", size: "عادي", price: 55, category: "أكلات", notes: "", materials: [
                    { name: "عيش شاورما", unit: "قطعة", qtyPerUnit: 1 },
                    { name: "دجاج مشوي", unit: "جرام", qtyPerUnit: 150 },
                    { name: "صلصة ثوم", unit: "مل", qtyPerUnit: 30 },
                    { name: "خس", unit: "جرام", qtyPerUnit: 20 },
                    { name: "طماطم", unit: "شريحة", qtyPerUnit: 2 }
                ] },
                { name: "عصير مانجو", qty: 2, variant: "بارد", size: "كبير", price: 35, category: "مشروبات", notes: "", materials: [
                    { name: "مانجو طازج", unit: "جرام", qtyPerUnit: 200 },
                    { name: "سكر", unit: "جرام", qtyPerUnit: 15 },
                    { name: "ثلج مكسر", unit: "جرام", qtyPerUnit: 100 },
                    { name: "أكواب بلاستيكية", unit: "قطعة", qtyPerUnit: 1 }
                ] }
            ], time: "12:15 ص" },
        ],
    },
    delivered: {
        online: [
            { id: 531, orderNumber: "A-1008", table: null, items: [
                { name: "موكا", qty: 1, variant: "ساخن", size: "كبير", price: 55, category: "مشروبات", notes: "", materials: [
                    { name: "إسبريسو / بن كولومبي", unit: "مل", qtyPerUnit: 60 },
                    { name: "شوكولاتة", unit: "جرام", qtyPerUnit: 20 },
                    { name: "حليب كامل الدسم", unit: "مل", qtyPerUnit: 200 },
                    { name: "كريمة مخفوقة", unit: "مل", qtyPerUnit: 30 }
                ] }
            ], time: "11:45 ص" },
            { id: 532, orderNumber: "A-1010", table: null, items: [
                { name: "باستا كريمية", qty: 1, variant: "كريمية", size: "عادي", price: 70, category: "أكلات", notes: "", materials: [
                    { name: "معكرونة باستا", unit: "جرام", qtyPerUnit: 200 },
                    { name: "قشطة", unit: "مل", qtyPerUnit: 80 },
                    { name: "جبنة بارميزان", unit: "جرام", qtyPerUnit: 30 },
                    { name: "ثوم", unit: "فص", qtyPerUnit: 2 }
                ] },
                { name: "ميلو كيك", qty: 1, variant: "عادي", size: "slice", price: 42, category: "حلويات", notes: "", materials: [] }
            ], time: "11:55 ص" },
            { id: 533, orderNumber: "A-1011", table: null, items: [
                { name: "شاي بالنعناع", qty: 2, variant: "ساخن", size: "كبير", price: 25, category: "مشروبات", notes: "", materials: [
                    { name: "نعناع مجفف", unit: "جرام", qtyPerUnit: 5 },
                    { name: "ماء ساخن", unit: "مل", qtyPerUnit: 250 }
                ] }
            ], time: "12:00 ص" },
        ],
        tables: [
            { id: 534, orderNumber: "T1-1", table: "طربيزة 1", items: [
                { name: "برجر دجاج", qty: 1, variant: "عادي", size: "عادي", price: 75, category: "أكلات", notes: "", materials: [
                    { name: "خبز برجر", unit: "قطعة", qtyPerUnit: 1 },
                    { name: " fillet دجاج", unit: "جرام", qtyPerUnit: 180 },
                    { name: "خس", unit: "جرام", qtyPerUnit: 25 },
                    { name: "مايونيز", unit: "مل", qtyPerUnit: 15 }
                ] },
                { name: "فرايز", qty: 1, variant: "عادي", size: "عادي", price: 35, category: "مقبلات", notes: "", materials: [
                    { name: "بطاطس طازجة", unit: "جرام", qtyPerUnit: 200 },
                    { name: "زيت قلي", unit: "مل", qtyPerUnit: 50 }
                ] }
            ], time: "11:50 ص" },
            { id: 535, orderNumber: "T4-1", table: "طربيزة 4", items: [
                { name: "كنافة", qty: 2, variant: "قشطة", size: "عادي", price: 50, category: "حلويات", notes: "", materials: [
                    { name: "كنافة نابلسية", unit: "جرام", qtyPerUnit: 150 },
                    { name: "قشطة", unit: "مل", qtyPerUnit: 50 },
                    { name: "شربات سكر", unit: "مل", qtyPerUnit: 40 }
                ] },
                { name: "إسبريسو", qty: 2, variant: "ساخن", size: "صغير", price: 25, category: "مشروبات", notes: "", materials: [
                    { name: "إسبريسو / بن كولومبي", unit: "مل", qtyPerUnit: 30 }
                ] }
            ], time: "12:05 ص" },
        ],
    },
};

export const MOCK_HISTORY_ORDERS = [
    { id: 901, type: "أونلاين", orderNumber: "A-1001", itemCount: 3, totalPrice: 150, date: "2026-08-25" },
    { id: 902, type: "طربيزات", orderNumber: "T1-1", itemCount: 4, totalPrice: 200, date: "2026-08-25" },
    { id: 903, type: "أونلاين", orderNumber: "A-1002", itemCount: 2, totalPrice: 80, date: "2026-08-25" },
    { id: 904, type: "طربيزات", orderNumber: "T3-1", itemCount: 3, totalPrice: 120, date: "2026-08-25" },
    { id: 905, type: "أونلاين", orderNumber: "A-1003", itemCount: 5, totalPrice: 250, date: "2026-08-24" },
    { id: 906, type: "طربيزات", orderNumber: "T5-1", itemCount: 2, totalPrice: 90, date: "2026-08-24" },
    { id: 907, type: "أونلاين", orderNumber: "A-1004", itemCount: 1, totalPrice: 45, date: "2026-08-24" },
    { id: 908, type: "طربيزات", orderNumber: "T2-1", itemCount: 6, totalPrice: 350, date: "2026-08-23" },
];

export const MOCK_ONLINE_CARDS = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    status: i === 0 || i === 2 || i === 4 ? "مشغول" : "فارغ",
    currentOrder: i === 0 ? "A-1015" : i === 2 ? "A-1016" : i === 4 ? "A-1018" : null,
}));

export const MOCK_TABLE_CARDS = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    status: i === 0 || i === 2 || i === 4 ? "مشغول" : "فارغ",
    pendingOrders: i === 0 ? 2 : i === 2 ? 1 : i === 4 ? 3 : 0,
}));
