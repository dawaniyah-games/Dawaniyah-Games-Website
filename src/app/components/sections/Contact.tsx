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

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

export function Contact() {
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
      toast.error(`Please wait ${minutesLeft} more minute${minutesLeft > 1 ? 's' : ''} before sending another message.`, { duration: 4000 });
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
      toast.success("Message sent!", {
        description: "We'll be in touch with you shortly via email.",
        duration: 4000,
      });
      form.reset();
    } catch (error) {
      toast.error("Failed to send message.", {
        description: "Please try again later or contact us directly by email.",
        duration: 4000,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="py-24 bg-[#0B021C] relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Contact Info */}
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT_ONCE}
            className="lg:w-1/3"
          >
            <h2 className="text-4xl font-bold font-['Josefin_Sans'] text-white mb-6">
              LET'S BUILD <br />
              <span className="text-[#D4AF37]">SOMETHING EPIC</span>
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Have a game idea? Need help scaling your current project? 
              Reach out to us and let's turn your vision into reality.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-[#D4AF37]">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Email Us</div>
                  <div className="font-semibold">eng.moghazy@gmail.com</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-[#0077b5]">
                  <Linkedin size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">LinkedIn</div>
                  <a href="https://www.linkedin.com/company/110097301/" target="_blank" rel="noreferrer" className="font-semibold hover:text-[#0077b5]">Follow Us</a>
                </div>
              </div>

              <div className="flex items-center gap-4 text-white">
                <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white">
                  <Github size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">GitHub</div>
                  <a href="https://github.com/dawaniyah-games/" target="_blank" rel="noreferrer" className="font-semibold hover:text-white">View Repositories</a>
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
            <div className="bg-white/5 p-8 rounded-2xl border border-white/5 backdrop-blur-sm">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your Name" 
                              className="bg-[#100425] border-white/10 text-white focus:border-[#D4AF37] h-12" 
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
                          <FormLabel className="text-gray-300">Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="your@email.com" 
                              className="bg-[#100425] border-white/10 text-white focus:border-[#D4AF37] h-12" 
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
                        <FormLabel className="text-gray-300">Project Details</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about your project..." 
                            className="bg-[#100425] border-white/10 text-white focus:border-[#D4AF37] min-h-[150px]" 
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
                        Sending…
                      </span>
                    ) : sent ? (
                      <span>Sent</span>
                    ) : (
                      <span>Send Message</span>
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
