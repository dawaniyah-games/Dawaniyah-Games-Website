import { useEffect } from "react";

export function useHero3DScroll(
  logoRef: React.RefObject<HTMLImageElement | null>,
  logoTextRef: React.RefObject<HTMLImageElement | null>,
  titleRef: React.RefObject<HTMLHeadingElement | null>,
  subtitleRef: React.RefObject<HTMLSpanElement | null>,
  descRef: React.RefObject<HTMLParagraphElement | null>,
  btnsRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    function handleScroll() {
      const hero = document.getElementById("hero");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const progress = Math.min(Math.max(-rect.top / windowHeight, 0), 1);
      // Logo and logo text: scale down and up
      if (logoRef.current) {
        logoRef.current.style.transform = `scale(${1 - progress * 0.3})`;
        logoRef.current.style.opacity = `${1 - progress * 1.2}`;
      }
      if (logoTextRef.current) {
        logoTextRef.current.style.transform = `scale(${1 - progress * 0.3})`;
        logoTextRef.current.style.opacity = `${1 - progress * 1.2}`;
      }
      // Title: move left, subtitle: move right
      if (titleRef.current) {
        titleRef.current.style.transform = `translateX(${-progress * 120}px)`;
        titleRef.current.style.opacity = `${1 - progress * 1.2}`;
      }
      if (subtitleRef.current) {
        subtitleRef.current.style.transform = `translateX(${progress * 120}px)`;
        subtitleRef.current.style.opacity = `${1 - progress * 1.2}`;
      }
      // Description: move left, buttons: move right
      if (descRef.current) {
        descRef.current.style.transform = `translateX(${-progress * 80}px)`;
        descRef.current.style.opacity = `${1 - progress * 1.2}`;
      }
      if (btnsRef.current) {
        btnsRef.current.style.transform = `translateX(${progress * 80}px)`;
        btnsRef.current.style.opacity = `${1 - progress * 1.2}`;
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [logoRef, logoTextRef, titleRef, subtitleRef, descRef, btnsRef]);
}
