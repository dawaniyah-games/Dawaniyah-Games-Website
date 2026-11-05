import React from 'react';
import emailjs from 'emailjs-com';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { PixelDissolve } from '../brand/PixelDissolve';
import iconMail from '../../../assets/brand/icon-mail.svg';
import iconLinkedIn from '../../../assets/brand/icon-linkedin.svg';
import iconGithub from '../../../assets/brand/icon-github.svg';
import { useTranslation } from 'react-i18next';

const fieldClass =
  'h-[60px] rounded-2xl border border-white/20 bg-white/10 px-4 text-white placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-saffron focus-visible:border-saffron';

export function Contact() {
  const { i18n } = useTranslation();
  return <ContactInner key={i18n.language} />;
}

function ContactInner() {
  const { t } = useTranslation();

  const formSchema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(2, {
          message: t('contact.validation.nameMin'),
        }),
        email: z.string().email({
          message: t('contact.validation.emailInvalid'),
        }),
        message: z.string().min(10, {
          message: t('contact.validation.messageMin'),
        }),
      }),
    [t],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const lastSent = localStorage.getItem('contact_last_sent');
    const now = Date.now();
    if (lastSent && now - parseInt(lastSent, 10) < 15 * 60 * 1000) {
      const minutesLeft = Math.ceil((15 * 60 * 1000 - (now - parseInt(lastSent, 10))) / 60000);
      toast.error(t('contact.toast.rateLimit', { count: minutesLeft, minutes: minutesLeft }), { duration: 4000 });
      return;
    }
    setSending(true);
    try {
      await emailjs.send(
        'service_9yg0wzc',
        'template_pjuy7bb',
        {
          from_name: values.name,
          from_email: values.email,
          message: values.message,
          to_email: 'info@dawaniyahgames.com',
        },
        'o0rZN6LvG1VBSTwFi'
      );
      localStorage.setItem('contact_last_sent', now.toString());
      setSent(true);
      toast.success(t('contact.toast.sentTitle'), {
        description: t('contact.toast.sentDesc'),
        duration: 4000,
      });
      form.reset();
    } catch (error) {
      toast.error(t('contact.toast.failedTitle'), {
        description: t('contact.toast.failedDesc'),
        duration: 4000,
      });
    } finally {
      setSending(false);
    }
  }

  const channels = [
    { label: t('contact.emailUs'), value: 'info@dawaniyahgames.com', href: 'mailto:info@dawaniyahgames.com', icon: iconMail, external: false },
    { label: t('contact.linkedIn'), value: t('contact.followUs'), href: 'https://www.linkedin.com/company/110097301/', icon: iconLinkedIn, external: true },
    { label: t('contact.github'), value: t('contact.viewRepos'), href: 'https://github.com/dawaniyah-games/', icon: iconGithub, external: true },
  ];

  return (
    <section className="relative bg-cream">
      <div className="page-gutter py-10">
        <div className="relative overflow-hidden rounded-[40px] bg-night text-white p-6 sm:p-10 lg:p-16 grid gap-10 lg:grid-cols-[minmax(0,500px)_minmax(0,544px)] lg:justify-between">
          <PixelDissolve color="#F6E7CF" />
          <div>
            <h2 className="t-h2 t-upper">
              <span className="block">{t('contact.headingTop')}</span>
              <span className="block">{t('contact.headingBottom')}</span>
            </h2>
            <p className="t-body-l opacity-80 mt-9">{t('contact.intro')}</p>

            <div className="flex flex-col gap-4 mt-10">
              {channels.map((channel) => (
                <a
                  key={channel.label}
                  href={channel.href}
                  target={channel.external ? '_blank' : undefined}
                  rel={channel.external ? 'noreferrer' : undefined}
                  className="flex items-center gap-[18px] rounded-[20px] bg-white/7 hover:bg-white/12 transition-colors p-[17px]"
                >
                  <span className="grid place-items-center size-12 shrink-0 rounded-[14px] bg-saffron">
                    <img src={channel.icon} alt="" width={24} height={24} />
                  </span>
                  <span className="min-w-0">
                    <span className="t-eyebrow text-saffron block">{channel.label}</span>
                    <span className="t-body block truncate" dir="auto">{channel.value}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-white/6 p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="t-eyebrow text-white/80">{t('contact.form.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('contact.form.namePlaceholder')} {...field} className={fieldClass} />
                      </FormControl>
                      <FormMessage className="text-saffron" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="t-eyebrow text-white/80">{t('contact.form.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" dir="ltr" placeholder={t('contact.form.emailPlaceholder')} {...field} className={fieldClass} />
                      </FormControl>
                      <FormMessage className="text-saffron" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="t-eyebrow text-white/80">{t('contact.form.details')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('contact.form.detailsPlaceholder')} {...field} className={`${fieldClass} min-h-[150px] h-[150px] py-4 resize-none`} />
                      </FormControl>
                      <FormMessage className="text-saffron" />
                    </FormItem>
                  )}
                />
                <button type="submit" disabled={sending || sent} className="btn btn-saffron t-button t-upper self-start">
                  {sending ? t('contact.form.sending') : sent ? t('contact.form.sent') : t('contact.form.send')}
                </button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
