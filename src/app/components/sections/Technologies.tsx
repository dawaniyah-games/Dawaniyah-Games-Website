import React from 'react';
import { useTranslation } from 'react-i18next';

const TECHNOLOGIES = ['Unity', 'Unreal Engine', 'C#', 'C++', 'GitHub', 'Firebase', 'Photon', 'Blender', 'Maya', 'React', 'Node.js', 'AWS'];

function TechList({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 gap-3.5 pe-3.5" dir="ltr">
      {TECHNOLOGIES.map((tech) => (
        <li key={tech} className="rounded-full bg-white/80 px-5 py-3 text-[18px] leading-[22px] font-semibold text-night whitespace-nowrap">
          {tech}
        </li>
      ))}
    </ul>
  );
}

export function Technologies() {
  const { t } = useTranslation();

  return (
    <section className="bg-cream text-night overflow-hidden pt-10 pb-[78px]">
      <h2 className="page-gutter t-eyebrow t-upper text-majlis">{t('technologies.poweredBy')}</h2>
      <div className="marquee mt-[38px]">
        <div className="marquee-track flex w-max">
          <TechList />
          <TechList hidden />
        </div>
      </div>
    </section>
  );
}
