/**
 * Create Pipeline Module
 * 
 * PURPOSE:
 * This module encapsulates the entire "Create Post" transaction.
 * It is designed as a linear, failure-safe pipeline with strict data boundaries.
 * 
 * DIRECTORY STRUCTURE:
 * - contracts/: Immutable data types defining the input/output of each phase.
 * - session/: Logic for managing the ephemeral transaction lifecycle (IDs, temp files).
 * - services/: Side-effect wrappers (Upload, API) - Pure logic, no UI.
 * - utils/: Helper functions and invariant assertions.
 * - navigation/: Type definitions for the navigation stack.
 * 
 * BOUNDARY RULES:
 * 1. NO EXTERNAL IMPORTS: Do not import from 'screens/', 'components/', or 'feed/'. 
 *    Rationale: This module must be standalone to prevent tight coupling.
 *    Exception: Core infrastructure (firebase, storage, auth providers) and Global Styles.
 * 
 * 2. NO CROSS-PHASE STATE: State is passed strictly via Navigation Params.
 *    Rationale: Prevents "zombie state" in global stores after crashes/cancellations.
 * 
 * 3. FAIL FAST: Runtime contracts are asserted at the entry of each phase.
 *    Rationale: Better to crash/reset early than upload corrupted data.
 * 
 * ---
 * 
 * 🎨 UX & DESIGN SYSTEM (PROJECT-DRIVEN)
 * Derived from `src/theme/colors.ts`, `src/theme/fonts.ts`, `src/GlobalStyles.ts`.
 * 
 * 1. Brand Identity
 *    - Primary: Orange (#FF5C02) - Used for primary actions (Next, Share, Selected State).
 *    - Backgrounds: 
 *       - MediaPick: White (#FFFFFF) for clean gallery clarity.
 *       - Adjust: Dark (#1A1A1A) for cinematic focus on the image.
 *       - Details: White (#FFFFFF) for writing comfort.
 *    - Typography: Poppins Family.
 *       - Headers: Poppins-Bold (20px+)
 *       - Body: Poppins-Regular (16px)
 *       - Labels: Poppins-Medium (14px)
 *    - Shapes: Rounded corners (Radius 8/16) for buttons and inputs.
 * 
 * 2. Interaction Philosophy (Travel-First)
 *    - Calm, unintentional pacing. No rush.
 *    - "Memory Selection" -> "Framing" -> "Storytelling".
 *    - Animation: Ease-out, 300ms. No bouncy springs.
 * 
 * 3. Instagram Differentiation
 *    - No bottom sheets (Full screen clarity).
 *    - Single distinct accent color (Orange) vs IG Blue/Gradient.
 *    - Typography-led hierarchy (Poppins) vs Icon-led.
 *    - Explicit "Travel Memory" language ("Select a memory", "Frame your shot").
 */
