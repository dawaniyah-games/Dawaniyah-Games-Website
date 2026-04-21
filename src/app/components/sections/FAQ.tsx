import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { fadeUp, VIEWPORT_ONCE } from "../../motion/presets";

export function FAQ() {
  const { t } = useTranslation();

  const items = [
    { q: t("faq.items.q1.question"), a: t("faq.items.q1.answer") },
    { q: t("faq.items.q2.question"), a: t("faq.items.q2.answer") },
    { q: t("faq.items.q3.question"), a: t("faq.items.q3.answer") },
    { q: t("faq.items.q4.question"), a: t("faq.items.q4.answer") },
    { q: t("faq.items.q5.question"), a: t("faq.items.q5.answer") },
    { q: t("faq.items.q6.question"), a: t("faq.items.q6.answer") },
    { q: t("faq.items.q7.question"), a: t("faq.items.q7.answer") },
    { q: t("faq.items.q8.question"), a: t("faq.items.q8.answer") },
    { q: t("faq.items.q9.question"), a: t("faq.items.q9.answer") },
    { q: t("faq.items.q10.question"), a: t("faq.items.q10.answer") },
  ];

  return (
    <section
      id="faq"
      className="py-24 bg-[#100425] relative"
    >
      <div className="container mx-auto px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          className="text-center mb-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Josefin_Sans'] text-white mb-4">
            <span className="text-[#D4AF37]">{t("faq.heading")}</span>
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto">{t("faq.subheading")}</p>
        </motion.div>

        <div className="max-w-3xl mx-auto rounded-2xl bg-white/5 border border-white/10 p-2 md:p-4 [html[dir='rtl']_&]:text-right">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-white/10">
                <AccordionTrigger className="px-4 text-base md:text-lg text-white hover:no-underline">
                  <span className="font-['Josefin_Sans'] font-bold tracking-wide">{item.q}</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 text-base md:text-lg text-gray-300 leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
