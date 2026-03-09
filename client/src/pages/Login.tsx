import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../app/providers/AuthProvider';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { Eye, EyeOff, GraduationCap, ShieldCheck, Sparkles, Lock, User as UserIcon } from 'lucide-react';

const CREDENTIALS = {
    admin: { email: 'sanjay@fsdp.com', password: '123456' },
    faculty: { email: 'faculty@fsdp.com', password: '123456' },
};

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
    const { login } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const emailRef = useRef<HTMLInputElement | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const { ref: emailFormRef, ...emailRest } = register('email');

    const fillCredentials = (role: 'admin' | 'faculty') => {
        setValue('email', CREDENTIALS[role].email, { shouldValidate: true });
        setValue('password', CREDENTIALS[role].password, { shouldValidate: true });
    };

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        try {
            await login(data.email, data.password);
            addToast('Login successful!', 'success');
        } catch {
            addToast('Invalid email or password. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <GraduationCap className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">FSD Portal</span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
                    <p className="text-sm text-slate-500 mb-7">Sign in to your professional workspace</p>

                    {/* Quick-fill chips */}
                    <div className="flex gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => fillCredentials('admin')}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 text-sm font-semibold transition-all"
                        >
                            <ShieldCheck className="h-4 w-4" /> Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => fillCredentials('faculty')}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-700 text-sm font-semibold transition-all"
                        >
                            <Sparkles className="h-4 w-4" /> Faculty
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="on">
                        {/* Email */}
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                                <UserIcon className="h-4 w-4 text-slate-400" /> Email
                            </label>
                            {/* datalist provides browser-native autocomplete suggestions */}
                            <datalist id="email-suggestions">
                                <option value={CREDENTIALS.admin.email} label="Admin" />
                                <option value={CREDENTIALS.faculty.email} label="Faculty" />
                            </datalist>
                            <input
                                {...emailRest}
                                ref={(e) => {
                                    emailFormRef(e);
                                    emailRef.current = e;
                                }}
                                type="email"
                                list="email-suggestions"
                                autoComplete="email"
                                placeholder="you@example.com"
                                className={`w-full h-12 px-4 rounded-xl border text-sm font-medium outline-none transition-all
                                    ${errors.email
                                        ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                                        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                    }`}
                            />
                            {errors.email && (
                                <p className="text-xs text-rose-600 font-medium mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                                <Lock className="h-4 w-4 text-slate-400" /> Password
                            </label>
                            <div className="relative">
                                <input
                                    {...register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className={`w-full h-12 px-4 pr-12 rounded-xl border text-sm font-medium outline-none transition-all
                                        ${errors.password
                                            ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                                            : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                        }`}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-rose-600 font-medium mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="w-full h-12 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all mt-2"
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Credential hint */}
                    <div className="mt-6 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
                        <p className="font-semibold text-slate-600 mb-1">Demo credentials</p>
                        <p>🛡️ Admin: <span className="font-mono text-slate-700">{CREDENTIALS.admin.email}</span> / <span className="font-mono text-slate-700">{CREDENTIALS.admin.password}</span></p>
                        <p>👨‍🏫 Faculty: <span className="font-mono text-slate-700">{CREDENTIALS.faculty.email}</span> / <span className="font-mono text-slate-700">{CREDENTIALS.faculty.password}</span></p>
                        <p className="text-[11px]">If your DB is freshly seeded, alternate admin may be <span className="font-mono text-slate-700">admin@fsdp.com / Admin@123</span>.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
