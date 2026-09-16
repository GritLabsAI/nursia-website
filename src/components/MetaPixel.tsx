"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { nextPageView, viewContentFor } from "@/lib/pageViews";

/**
 * The Meta pixel, loaded once and kept in step with client-side navigation.
 *
 * The snippet Meta hands you in the dialog assumes a page reload per view. In
 * an App Router site most navigations never reload anything, so a copy-paste
 * of that snippet reports one PageView for a whole session and every later
 * event lands with no page context. Hence the effect below: the base code
 * fires the first PageView itself, and each subsequent pathname change fires
 * the next one — which is what `@next/third-parties` already does for GA4.
 *
 * Silent no-op without an id, exactly like the GA4 and Ads tags: a missing env
 * var must never break a page.
 */
/* The last path a PageView was counted for, per page load. Module-level rather
   than a ref: React Strict Mode (and any remount) runs the effect again for the
   same path, and a ref would be reset with the component. */
let lastPageViewPath: string | null = null;
/* Same reasoning for ViewContent, but it needs its own guard: the base code
   fires no ViewContent, so the first load counts. */
let lastViewContentPath: string | null = null;

export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const { fire, last } = nextPageView(lastPageViewPath, pathname);
    lastPageViewPath = last;
    try {
      if (fire) window.fbq?.("track", "PageView");
      const content = viewContentFor(pathname);
      if (content && lastViewContentPath !== pathname) {
        lastViewContentPath = pathname;
        window.fbq?.("track", "ViewContent", content);
      }
    } catch {
      /* analytics must never take a page down with it */
    }
  }, [pathname]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${pixelId}');
          fbq('track','PageView');`}
      </Script>
      {/* The no-script beacon is what Meta's "Continue Pixel Setup" checker
          looks for when it verifies the install, and it is the only signal
          left when JavaScript is off. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
