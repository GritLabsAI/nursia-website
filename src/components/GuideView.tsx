"use client";

import { useEffect, useRef } from "react";
import { guideViewed } from "@/lib/analytics";
import { assign, readAnonymousId, type Experiment } from "@/lib/experiment";

/**
 * Step one of the funnel: somebody arrived.
 *
 * GA4 already counts page views, so this looks redundant and is not. A page
 * view carries a path; this carries the things the funnel is analysed by —
 * which cluster, which topic, which resource is being offered, and which arm
 * of the experiment this browser is in. Reconstructing any of that from a URL
 * afterwards means maintaining a second copy of the content graph inside
 * Google Analytics, which nobody ever keeps in step.
 *
 * Renders nothing. It exists so the page above it can stay a server component.
 */
export function GuideView({
  guide,
  cluster,
  topic,
  resource,
  experiment,
}: {
  guide: string;
  cluster?: string;
  topic?: string;
  resource?: string;
  experiment?: Experiment | null;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    /* Assigned here as well as in the gate so the arm is on the arrival event
       too — otherwise the denominator of the experiment (readers who landed)
       is missing the one dimension the numerator is cut by. `assign` is pure
       and deterministic, so both places agree by construction. */
    const variant = experiment
      ? assign(experiment, readAnonymousId())?.key
      : undefined;

    guideViewed({ guide, cluster, topic, resource, experiment: experiment?.key, variant });
  }, [guide, cluster, topic, resource, experiment]);

  return null;
}
