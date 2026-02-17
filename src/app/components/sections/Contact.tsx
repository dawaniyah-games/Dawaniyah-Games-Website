import React from 'react';
import emailjs from 'emailjs-com';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { Mail, Globe, Github, Linkedin } from 'lucide-react';
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
import { fadeLeft, fadeRight, VIEWPORT_ONCE } from '../../motion/presets';
import { useTranslation } from 'react-i18next';

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
          to_email: 'eng.moghazy@gmail.com',
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

  return (
    <section id="contact" className="py-24 bg-[#0B021C] relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:[html[dir='rtl']_&]:flex-row-reverse gap-16">
          {/* Contact Info */}
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
            className="lg:w-1/3 lg:[html[dir='rtl']_&]:text-right"
          >
            <h2 className="text-4xl font-bold font-['Josefin_Sans'] text-white mb-6">
              {t('contact.headingTop')} <br />
              <span className="text-[#D4AF37]">{t('contact.headingBottom')}</span>
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              {t('contact.intro')}
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4 text-white [html[dir='rtl']_&]:flex-row-reverse">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-[#D4AF37]">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">{t('contact.emailUs')}</div>
                  <div className="font-semibold">eng.moghazy@gmail.com</div>
                </div>
              </div>
              {/* Phone Number */}
              <div className="flex items-center gap-4 text-white [html[dir='rtl']_&]:flex-row-reverse">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-[#D4AF37]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone"><path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5 3h2.09a2 2 0 0 1 2 1.72c.13 1.01.36 2 .7 2.92a2 2 0 0 1-.45 2.11l-.27.27a16 16 0 0 0 6.11 6.11l.27-.27a2 2 0 0 1 2.11-.45c.92.34 1.91.57 2.92.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div>
                  <div className="text-sm text-gray-400">{t('contact.phoneLabel')}</div>
                  <div className="font-semibold">{t('contact.phone')}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-white [html[dir='rtl']_&]:flex-row-reverse">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-[#0077b5]">
                  <Linkedin size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">{t('contact.linkedIn')}</div>
                  <a href="https://www.linkedin.com/company/110097301/" target="_blank" rel="noreferrer" className="font-semibold hover:text-[#0077b5]">{t('contact.followUs')}</a>
                </div>
              </div>

              <div className="flex items-center gap-4 text-white [html[dir='rtl']_&]:flex-row-reverse">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white">
                  <Github size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">{t('contact.github')}</div>
                  <a href="https://github.com/dawaniyah-games/" target="_blank" rel="noreferrer" className="font-semibold hover:text-white">{t('contact.viewRepos')}</a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            variants={fadeRight}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
            className="lg:w-2/3"
          >
            <div className="bg-white/5 p-8 rounded-2xl border border-white/5 backdrop-blur-sm [html[dir='rtl']_&]:text-right">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">{t('contact.form.name')}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('contact.form.namePlaceholder')}
                              className="bg-[#100425] border-white/10 text-white focus:border-[#D4AF37] h-12 [html[dir='rtl']_&]:text-right" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">{t('contact.form.email')}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('contact.form.emailPlaceholder')}
                              className="bg-[#100425] border-white/10 text-white focus:border-[#D4AF37] h-12 [html[dir='rtl']_&]:text-right" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">{t('contact.form.details')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={t('contact.form.detailsPlaceholder')}
                            className="bg-[#100425] border-white/10 text-white focus:border-[#D4AF37] min-h-[150px] [html[dir='rtl']_&]:text-right" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full md:w-auto min-w-[200px] bg-[#D4AF37] text-[#100425] hover:bg-[#C5A059] border-none font-bold flex items-center justify-center"
                    disabled={sending || sent}
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-[#100425]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        {t('contact.form.sending')}
                      </span>
                    ) : sent ? (
                      <span>{t('contact.form.sent')}</span>
                    ) : (
                      <span>{t('contact.form.send')}</span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
