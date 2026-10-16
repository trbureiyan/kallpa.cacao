// Augmentación de tipos para vitest-axe 0.1.0.
// AxeMatchers declara toHaveNoViolations(); aquí se inyecta en Assertion de
// vitest para que tsc reconozca el método. Sin dependencias nuevas.
import type { AxeMatchers } from 'vitest-axe/matchers'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
