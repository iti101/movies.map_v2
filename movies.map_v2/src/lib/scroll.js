/** Smooth-scroll a snap section into view (used by Get Started → #search). */
export function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
}

/** Wait a tick so overlays can unmount before the snap-scroll runs. */
export function scrollToSectionSoon(sectionId) {
  window.setTimeout(() => scrollToSection(sectionId), 0)
}
