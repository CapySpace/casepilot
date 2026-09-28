import Image from "next/image";

import logo from "@/public/brand/casepilot-logo.png";

/**
 * The CasePilot lockup: the mark and the word, as supplied by the brand.
 *
 * Every page that shows the product's name shows this — the authentication frame and the Projects header —
 * so there is one place to change when the asset changes, and one accessible name for it. That name is
 * "CasePilot" and not "CasePilot logo": a screen reader announces the element's role already, and what the
 * image *says* is the product's name.
 *
 * Height first, width from the asset's own ratio, so the lockup cannot be squashed by a caller. 44px is
 * chosen from the artwork rather than the frame: the word occupies about two fifths of the lockup's height,
 * so this is what makes it read at the size the header's own type does. The PNG is
 * 640px wide against a control drawn 44px tall — about five times over, which is the headroom a raster
 * mark needs and cheap at this file size; the
 * artwork itself is `public/brand/`, with the square mark beside it for the icons.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="CasePilot"
      // Both dimensions, from the artwork's own ratio. Giving only one and letting a class set the other is
      // what Next.js warns about, because it cannot see a Tailwind class and so cannot tell a deliberate
      // resize from a squashed image.
      width={121}
      height={44}
      // At the top of every page, and the one thing that says which product this is.
      priority
      // No sizing classes: with both dimensions given, a Tailwind class that set one of them would be the
      // very thing the warning above is about — Next.js cannot read a class, so it sees one dimension
      // changed by CSS and assumes the image is being squashed.
      className={className}
    />
  );
}
