"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { nextPageView } from "@/lib/pageViews";
import { nextViewContent, type ViewContentParams } from "@/lib/metaViewContent";

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
/* Same idea for ViewContent, which (unlike PageView) the base code doesn't send. */
let lastViewContentPath: string | null = null;

/**
 * Send ViewContent once the Pixel exists. The base code is an afterInteractive
 * script, so on the first page load this effect can run before `fbq` is
 * defined; wait briefly rather than lose the landing page's view. Creating a
 * stand-in `fbq` here is not an option: the base code skips `init` when one
 * already exists.
 */
function trackViewContent(params: ViewContentParams) {
  const send = () => {
    try {
      window.fbq?.("track", "ViewContent", params);
    } catch {
      /* analytics must never take a page down with it */
    }
  };
  if (window.fbq) return send();
  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    if (window.fbq) {
      window.clearInterval(timer);
      send();
    } else if (Date.now() - startedAt > 8000) {
      window.clearInterval(timer); // blocked or no pixel: nothing to send to
    }
  }, 100);
}

export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const { fire, last } = nextPageView(lastPageViewPath, pathname);
    lastPageViewPath = last;
    if (fire) {
      try {
        window.fbq?.("track", "PageView");
      } catch {
        /* analytics must never take a page down with it */
      }
    }
    // Landing pages, guides and pricing also send ViewContent on every view
    // (growth tracker, "Meta event flow"); see src/lib/metaViewContent.ts.
    const view = nextViewContent(lastViewContentPath, pathname);
    lastViewContentPath = view.last;
    if (view.params) trackViewContent(view.params);
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
