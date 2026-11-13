import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Button, Field, Input } from '../../components/ui';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      await api.post('/auth/reset-password', { token, new_password: data.password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Reset failed');
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-gray">Invalid reset link.</p>
          <Link to="/login" className="text-xs underline text-burnt-amber mt-2 block">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-bone rounded-xl p-6">
        <h1 className="text-lg font-medium text-ink-black mb-2">Set New Password</h1>
        {success ? (
          <p className="text-sm text-slate-gray">Password reset! Redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label="New password" htmlFor="password" error={errors.password?.message} required>
              <Input id="password" type="password" autoComplete="new-password" error={!!errors.password} {...register('password')} />
            </Field>
            <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message} required>
              <Input id="confirm" type="password" autoComplete="new-password" error={!!errors.confirm} {...register('confirm')} />
            </Field>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
            <Button type="submit" className="w-full" loading={isSubmitting}>Set password</Button>
          </form>
        )}
      </div>
    </div>
  );
}
