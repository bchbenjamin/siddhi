import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';
import type { LoginResponse } from '../../types';
import { Button, Field, Input } from '../../components/ui';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

type LoginMode = 'guardian' | 'staff';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('staff');
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      const res = await api.post<LoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
        client_mode: mode,
      });
      login(res.user);
      navigate(res.user.landing_route, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed');
    }
  }

  return (
    <div className="min-h-screen bg-paper-white flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-burnt-amber flex items-center justify-center">
          <GraduationCap size={20} className="text-white" />
        </div>
        <span className="text-2xl font-medium text-ink-black tracking-tight">Siddhi</span>
      </div>

      <div className="w-full max-w-sm">
        {/* Mode selector */}
        <div
          className="flex rounded-full border border-bone p-1 mb-6 bg-bone/30"
          role="group"
          aria-label="Login type"
        >
          {(['staff', 'guardian'] as LoginMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-colors ${
                mode === m
                  ? 'bg-white text-ink-black shadow-sm'
                  : 'text-slate-gray hover:text-ink-black'
              }`}
            >
              {m === 'staff' ? 'School Staff' : 'Guardian'}
            </button>
          ))}
        </div>

        <div className="bg-white border border-bone rounded-xl p-6">
          <h1 className="text-lg font-medium text-ink-black mb-1">
            {mode === 'guardian' ? 'Sign in as Guardian' : 'Sign in as School Staff'}
          </h1>
          <p className="text-sm text-slate-gray mb-5">
            {mode === 'guardian'
              ? "Access your children's IEP records and progress."
              : 'Manage IEP plans, goals, and student progress.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field
              label="Email address"
              htmlFor="email"
              error={errors.email?.message}
              required
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={!!errors.email}
                {...register('email')}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              error={errors.password?.message}
              required
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                error={!!errors.password}
                {...register('password')}
              />
            </Field>

            {serverError && (
              <p className="text-xs text-burgundy bg-dusty-rose/20 rounded-lg px-3 py-2" role="alert">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/forgot-password"
              className="text-xs text-slate-gray hover:text-ink-black underline"
            >
              Forgot password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
