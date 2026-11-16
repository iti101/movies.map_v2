/** Smooth-scroll a snap section into view (used by Get Started → #search). */
export function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
}
