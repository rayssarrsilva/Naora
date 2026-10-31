'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@rayssarrsilva/ipe';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { createBusinessAction } from '@/app/[locale]/painel/actions';
import { type BusinessInput, businessSchema } from '@/lib/business/schema';
import { slugify } from '@/lib/business/slug';
import { applyServerErrors, useErrorText } from './use-action-errors';

export function OnboardingForm({ origin }: { origin: string }) {
  const t = useTranslations('Panel');
  const errorText = useErrorText();
  const [formError, setFormError] = useState<string>();
  // The address follows the name until the person edits it themselves.
  const [slugTouched, setSlugTouched] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { name: '', slug: '' },
  });
  const slug = useWatch({ control, name: 'slug' });

  async function submit(values: BusinessInput) {
    setFormError(undefined);
    const result = await createBusinessAction(values);
    setFormError(applyServerErrors(result, setError));
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid max-w-xl gap-4">
      <Input
        label={t('name')}
        placeholder={t('namePlaceholder')}
        autoComplete="organization"
        error={errorText(errors.name?.message)}
        {...register('name', {
          onChange: (event) => {
            if (!slugTouched) setValue('slug', slugify(event.target.value));
          },
        })}
      />
      <Input
        label={t('slug')}
        hint={t('slugHint', { url: `${origin}/b/${slug || '…'}` })}
        autoCapitalize="none"
        spellCheck={false}
        error={errorText(errors.slug?.message)}
        {...register('slug', { onChange: () => setSlugTouched(true) })}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" loading={isSubmitting}>
          {t('create')}
        </Button>
        <p role="alert" className="text-feedback-danger">
          {errorText(formError)}
        </p>
      </div>
    </form>
  );
}
