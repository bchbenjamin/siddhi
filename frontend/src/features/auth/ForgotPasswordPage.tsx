import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Button, Field, Input } from '../../components/ui';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    await api.post('/auth/forgot-password', { email: data.email });
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-paper-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-bone rounded-xl p-6">
        <h1 className="text-lg font-medium text-ink-black mb-2">Reset Password</h1>
        {submitted ? (
          <p className="text-sm text-slate-gray">
            If that email exists in the system, a reset link has been sent. Check your inbox or the
            development console.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-gray mb-4">
              Enter your email address and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Field label="Email" htmlFor="email" error={errors.email?.message} required>
                <Input id="email" type="email" autoComplete="email" error={!!errors.email} {...register('email')} />
              </Field>
              <Button type="submit" className="w-full" loading={isSubmitting}>
                Send reset link
              </Button>
            </form>
          </>
        )}
        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-slate-gray hover:text-ink-black underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
