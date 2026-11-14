'use client';

import { useEffect } from 'react';
import { useParams, useNavigate } from '../../lib/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import type { StudentDetail } from '../../types';
import { PageShell } from '../../components/layout/PageShell';
import { PageHeader, Card, Field, Input, Textarea, Button, LoadingState, ErrorState } from '../../components/ui';

const schema = z.object({
  full_name: z.string().min(1),
  date_of_birth: z.string().min(1),
  gender: z.string().optional(),
  disability_category: z.string().min(1),
  enrollment_date: z.string().min(1),
  grade_class: z.string().min(1),
  diagnosis: z.string().optional(),
  strengths: z.string().optional(),
  areas_of_need: z.string().optional(),
  learning_style: z.string().optional(),
  languages_known: z.string().optional(),
  assistive_devices: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export default function StudentEditPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: student, isLoading, error } = useQuery<StudentDetail>({
    queryKey: ['student', studentId],
    queryFn: () => api.get<StudentDetail>(`/students/${studentId}`),
    enabled: !!studentId,
  });
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (student) form.reset({
      full_name: student.full_name,
      date_of_birth: student.date_of_birth.slice(0,10),
      gender: student.gender || '',
      disability_category: student.disability_category,
      enrollment_date: student.enrollment_date.slice(0,10),
      grade_class: student.grade_class,
      diagnosis: student.diagnosis || '',
      strengths: student.strengths || '',
      areas_of_need: student.areas_of_need || '',
      learning_style: student.learning_style || '',
      languages_known: student.languages_known || '',
      assistive_devices: student.assistive_devices || '',
    });
  }, [student, form]);
  const mutation = useMutation({
    mutationFn: (values: Values) => api.patch(`/students/${studentId}`, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      navigate(`/students/${studentId}`);
    },
  });
  if (isLoading) return <PageShell><LoadingState /></PageShell>;
  if (error || !student) return <PageShell><ErrorState message="Unable to load this student profile." /></PageShell>;
  return <PageShell><div className="max-w-3xl mx-auto"><PageHeader title="Edit Student Profile" subtitle={student.full_name} /><Card><form onSubmit={form.handleSubmit(values => mutation.mutate(values))} className="space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Full name" htmlFor="full_name" required><Input id="full_name" {...form.register('full_name')} /></Field>
      <Field label="Date of birth" htmlFor="date_of_birth" required><Input id="date_of_birth" type="date" {...form.register('date_of_birth')} /></Field>
      <Field label="Gender" htmlFor="gender"><Input id="gender" {...form.register('gender')} /></Field>
      <Field label="Disability category" htmlFor="disability_category" required><Input id="disability_category" {...form.register('disability_category')} /></Field>
      <Field label="Enrollment date" htmlFor="enrollment_date" required><Input id="enrollment_date" type="date" {...form.register('enrollment_date')} /></Field>
      <Field label="Grade / class" htmlFor="grade_class" required><Input id="grade_class" {...form.register('grade_class')} /></Field>
      <Field label="Diagnosis" htmlFor="diagnosis"><Textarea id="diagnosis" rows={2} {...form.register('diagnosis')} /></Field>
      <Field label="Strengths" htmlFor="strengths"><Textarea id="strengths" rows={2} {...form.register('strengths')} /></Field>
      <Field label="Areas of need" htmlFor="areas_of_need"><Textarea id="areas_of_need" rows={2} {...form.register('areas_of_need')} /></Field>
      <Field label="Learning style" htmlFor="learning_style"><Textarea id="learning_style" rows={2} {...form.register('learning_style')} /></Field>
      <Field label="Languages known" htmlFor="languages_known"><Input id="languages_known" {...form.register('languages_known')} /></Field>
      <Field label="Assistive devices" htmlFor="assistive_devices"><Textarea id="assistive_devices" rows={2} {...form.register('assistive_devices')} /></Field>
    </div>
    {mutation.error && <p className="text-sm text-burgundy" role="alert">{mutation.error instanceof Error ? mutation.error.message : 'Unable to save changes.'}</p>}
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => navigate(`/students/${studentId}`)}>Cancel</Button><Button type="submit" loading={mutation.isPending}>Save changes</Button></div>
  </form></Card></div></PageShell>;
}
