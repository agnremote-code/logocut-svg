import type { PaidAttribution } from "./attribution";

export function getGaPageLocation(href: string) {
  try {
    const url = new URL(href);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function getGaCampaignFields(attribution: PaidAttribution) {
  return {
    campaign_source: attribution.utm_source,
    campaign_medium: attribution.utm_medium,
    campaign_name: attribution.utm_campaign,
    campaign_content: attribution.utm_content,
    campaign_term: attribution.utm_term,
  };
}
