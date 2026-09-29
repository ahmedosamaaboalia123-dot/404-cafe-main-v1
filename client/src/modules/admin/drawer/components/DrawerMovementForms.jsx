import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";

const empty = { amount: "", description: "" };
export default function DrawerMovementForms({ shiftId, cashIn, cashOut, onMessage }) {
  const [income, setIncome] = useState(empty);
  const [expense, setExpense] = useState(empty);
  const submit = (mutation, values, reset, message) => (event) => {
    event.preventDefault();
    mutation.mutate({ shiftId, data: { amount: Number(values.amount), description: values.description.trim() } }, { onSuccess: () => { reset(empty); onMessage(message); } });
  };
  return <section className="drawer-forms">
    <form onSubmit={submit(cashIn, income, setIncome, "تم تسجيل الإيراد")}><h3><ArrowUpCircle/>تسجيل إيراد يدوي</h3><label><span>المبلغ</span><input required min="0.01" step="0.01" type="number" value={income.amount} onChange={(event) => setIncome({ ...income, amount: event.target.value })}/></label><label><span>البيان</span><input required value={income.description} onChange={(event) => setIncome({ ...income, description: event.target.value })}/></label><button disabled={cashIn.isPending}><Plus size={15}/>تسجيل الإيراد</button></form>
    <form onSubmit={submit(cashOut, expense, setExpense, "تم تسجيل المصروف")}><h3><ArrowDownCircle/>تسجيل مصروف يدوي</h3><label><span>المبلغ</span><input required min="0.01" step="0.01" type="number" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })}/></label><label><span>السبب</span><input required value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })}/></label><button className="expense" disabled={cashOut.isPending}><Plus size={15}/>تسجيل المصروف</button></form>
  </section>;
}
