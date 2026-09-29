import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@/shared/components/Button/Button";
import Input from "@/shared/components/Input/Input";
import { useLogin } from "./useLogin";
import LoginArt from "./LoginArt";
import logo from "@/assets/images/404_logo-640.webp";
import "./LoginPage.css";

const loginSchema = z.object({
  name: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة").max(128, "كلمة المرور أطول من المسموح"),
});

function LoginPage() {
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });
  const isPendingDevice = login.data?.status === "DEVICE_APPROVAL_REQUIRED";
  const pollSeconds = Number(login.data?.pollAfterSeconds ?? 5);
  // تلقائي: يستطلع كل pollAfterSeconds حتى يتحول 202 → 200 أو يُحظر
  React.useEffect(() => {
    if (!isPendingDevice || !login.variables) return;
    const id = setInterval(() => login.mutate(login.variables), Math.max(2000, pollSeconds * 1000));
    return () => clearInterval(id);
  }, [isPendingDevice, pollSeconds, login.variables]);
  return (
    <div className="login-page" dir="rtl">
      <aside className="login-side" aria-label="404 كافيه">
        <img className="login-side__logo" src={logo} alt="شعار 404" />
        <LoginArt />
        <div className="login-side__brand">404</div>
        <p className="login-side__tagline">قهوتك تبدأ من هنا</p>
      </aside>
      <main className="login-form-side">
        <svg className="login-form-side__bg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <g fill="none" stroke="#6B3F1D" strokeWidth="5" opacity="0.1">
            <g transform="translate(120,90) rotate(24)">
              <ellipse cx="0" cy="0" rx="30" ry="21" />
              <path d="M-3,-19 C-10,-7 -10,7 -3,19" strokeLinecap="round" />
            </g>
            <g transform="translate(680,500) rotate(-20)">
              <ellipse cx="0" cy="0" rx="34" ry="24" />
              <path d="M-4,-22 C-11,-8 -11,8 -4,22" strokeLinecap="round" />
            </g>
            <g transform="translate(690,110)">
              <path d="M-26,-36 L-26,8 C-26,32 -10,44 10,44 C30,44 42,32 42,8 L42,-36 Z" />
              <ellipse cx="8" cy="-36" rx="34" ry="10" />
              <path d="M42,-22 C64,-22 64,16 34,18" />
            </g>
            <g transform="translate(110,470)">
              <path d="M-26,-36 L-26,8 C-26,32 -10,44 10,44 C30,44 42,32 42,8 L42,-36 Z" />
              <ellipse cx="8" cy="-36" rx="34" ry="10" />
              <path d="M42,-22 C64,-22 64,16 34,18" />
            </g>
            <path d="M400,60 C390,40 412,28 402,8" strokeLinecap="round" />
            <path d="M430,62 C420,42 442,30 432,10" strokeLinecap="round" />
            <circle cx="250" cy="140" r="7" fill="#6B3F1D" stroke="none" />
            <circle cx="560" cy="200" r="6" fill="#6B3F1D" stroke="none" />
            <circle cx="200" cy="420" r="6" fill="#6B3F1D" stroke="none" />
            <circle cx="600" cy="380" r="7" fill="#6B3F1D" stroke="none" />
          </g>
        </svg>
        <form className="login-card" onSubmit={handleSubmit(data => login.mutate(data))} aria-label="تسجيل الدخول">
          <h1 className="login-card__title">تسجيل الدخول</h1>
          <p className="login-card__subtitle">أدخل بياناتك للوصول إلى لوحة الإدارة</p>
          <Input {...register("name")} label="اسم المستخدم" placeholder="أدخل اسم المستخدم" error={errors.name?.message}/>
          <Input {...register("password")} label="كلمة المرور" type="password" placeholder="أدخل كلمة المرور" error={errors.password?.message}/>
          {login.isError && <p className="login-card__error" role="alert">{login.error?.message || "تعذر تسجيل الدخول. تأكد من تشغيل الخادم."}</p>}
          {isPendingDevice && <div className="login-card__pending" role="status">
            <p>الجهاز في انتظار موافقة المسؤول — سيتم الدخول تلقائيًا بعد الموافقة.</p>
            <small>يُعاد التحقق كل {pollSeconds} ثوانٍ</small>
          </div>}
          <Button type="submit" disabled={login.isPending}>{login.isPending ? "جاري الدخول..." : "دخول"}</Button>
        </form>
      </main>
    </div>
  );
}
export default LoginPage;
