import { useState } from 'react';
import { useNavigate } from '../../lib/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';
import type { LoginResponse } from '../../types';
import { Button, Field, Input } from '../../components/ui';

const schema = z.object({
  identifier: z.string().min(3, 'Enter your faculty ID'),
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
        identifier: data.identifier,
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
      <div className="mb-8">
        <span className="text-sm font-medium text-ink-black tracking-[0.12em]">SIDDHI</span>
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

        <div className="bg-white border border-stone-border rounded-lg p-6">
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
              label={mode === 'guardian' ? 'Email address' : 'Faculty ID'}
              htmlFor="identifier"
              error={errors.identifier?.message}
              required
            >
              <Input
                id="identifier"
                type={mode === 'guardian' ? 'email' : 'text'}
                autoComplete={mode === 'guardian' ? 'email' : 'username'}
                placeholder={mode === 'guardian' ? 'you@example.com' : 'FAC-0001'}
                error={!!errors.identifier}
                {...register('identifier')}
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
