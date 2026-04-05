import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { Eye, EyeOff, KeyRound, Mail, GraduationCap, ShieldCheck, LineChart, Info } from 'lucide-react';

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
    const [showResetMessage, setShowResetMessage] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

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
        <div className="relative min-h-screen overflow-hidden bg-slate-50">
            <div className="pointer-events-none absolute left-0 top-0 h-80 w-80 rounded-full bg-blue-100 blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-slate-200/70 blur-3xl" />

            <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:py-12">
                <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-2">
                    <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                        <div>
                            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">
                                <GraduationCap className="h-4 w-4" />
                                Faculty Skill Development Portal
                            </div>
                            <h1 className="max-w-sm text-4xl font-black leading-tight text-white">
                                Build stronger faculty capabilities with confidence.
                            </h1>
                            <p className="mt-4 max-w-md text-sm text-blue-100">
                                One platform for assessments, learning programs, AI-guided growth, and role-based tracking.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <ShieldCheck className="h-5 w-5 text-blue-100" />
                                <p className="text-sm font-semibold">Secure role-based access for faculty and admins</p>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <LineChart className="h-5 w-5 text-blue-100" />
                                <p className="text-sm font-semibold">Track performance and progress in one dashboard</p>
                            </div>
                        </div>
                    </section>

                    <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
                        <div className="w-full max-w-md">
                            <Link
                                to="/"
                                className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                            >
                                <GraduationCap className="h-3.5 w-3.5" />
                                Back to Home
                            </Link>

                            <h2 className="text-3xl font-black tracking-tight text-slate-900">Sign In</h2>
                            <p className="mt-2 text-sm text-slate-500">Enter your official credentials to continue.</p>

                            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" autoComplete="on">
                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <Mail className="h-4 w-4 text-blue-600" /> Work Email
                                    </label>
                                    <input
                                        {...register('email')}
                                        type="email"
                                        autoComplete="email"
                                        placeholder="name@university.edu"
                                        className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400
                                            ${errors.email
                                                ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                                                : 'border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                                            }`}
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-xs font-medium text-rose-500">{errors.email.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <KeyRound className="h-4 w-4 text-blue-600" /> Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register('password')}
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="Enter your password"
                                            className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400
                                                ${errors.password
                                                    ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                                                    : 'border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-800"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1 text-xs font-medium text-rose-500">{errors.password.message}</p>
                                    )}
                                </div>

                                <Button type="submit" isLoading={isLoading} className="h-12 w-full">
                                    Enter Portal
                                </Button>
                            </form>

                            <div className="mt-4 text-right">
                                <button
                                    type="button"
                                    onClick={() => setShowResetMessage((prev) => !prev)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    {showResetMessage ? 'Hide password help' : 'Forgot password?'}
                                </button>
                            </div>

                            {showResetMessage && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    <div className="flex items-start gap-2">
                                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
                                        <div>
                                            <p className="font-semibold">Password help</p>
                                            <p className="mt-1">Please contact your admin to reset your password.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="mt-8 text-center text-xs text-slate-500">
                                Secure academic workspace. Authorized users only.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
