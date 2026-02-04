import { useEffect } from "react";

export function useSection3DScroll(refs: Record<string, React.RefObject<HTMLElement>>) {
  useEffect(() => {
    function handleScroll() {
      const section = refs.section?.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const progress = Math.min(Math.max(-rect.top / windowHeight, 0), 1);
      // Example: animate each ref if present
      if (refs.image?.current) {
        refs.image.current.style.transform = `scale(${1 - progress * 0.2}) rotateY(${progress * 10}deg)`;
        refs.image.current.style.opacity = `${1 - progress * 1.2}`;
      }
      if (refs.header?.current) {
        refs.header.current.style.transform = `translateX(${-progress * 80}px)`;
        refs.header.current.style.opacity = `${1 - progress * 1.2}`;
      }
      if (refs.text?.current) {
        refs.text.current.style.transform = `translateX(${progress * 80}px)`;
        refs.text.current.style.opacity = `${1 - progress * 1.2}`;
      }
      if (refs.stats?.current) {
        refs.stats.current.style.transform = `scale(${1 - progress * 0.1})`;
        refs.stats.current.style.opacity = `${1 - progress * 1.2}`;
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [refs]);
}
