import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { useTranslation } from 'react-i18next';

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

export function FAQ() {
  const { t } = useTranslation();

  return (
    <section className="bg-ivory text-night">
      <div className="page-gutter py-16 lg:py-24">
        <h2 className="t-h2 t-upper">{t('faq.heading')}</h2>
        <p className="t-body-l opacity-75 mt-3.5 max-w-[900px]">{t('faq.subheading')}</p>

        <Accordion.Root type="single" collapsible defaultValue="q1" className="flex flex-col gap-3 mt-11">
          {QUESTIONS.map((key) => (
            <Accordion.Item
              key={key}
              value={key}
              className="group rounded-[20px] bg-white/60 data-[state=open]:bg-white/92 transition-colors"
            >
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between gap-6 px-7 py-[22px] text-start rounded-[20px] cursor-pointer focus-visible:outline-3 focus-visible:outline-dusk">
                  <span className="t-h3">{t(`faq.items.${key}.question`)}</span>
                  <span aria-hidden="true" className="t-h3 text-majlis shrink-0 w-4 text-center">
                    <span className="group-data-[state=open]:hidden">+</span>
                    <span className="hidden group-data-[state=open]:inline">–</span>
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <p className="t-body opacity-80 px-7 pb-6">{t(`faq.items.${key}.answer`)}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
