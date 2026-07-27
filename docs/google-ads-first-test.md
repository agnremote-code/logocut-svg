# LogoCut Google Search First Test

This is a build specification only. Keep the campaign paused until the GA4
Measurement ID, conversion import, billing, and account-owner approval are
complete.

## Campaign

| Setting | Value |
| --- | --- |
| Name | `LogoCut \| Search \| US \| First Test` |
| Objective | Sales |
| Campaign type | Search |
| Final URL | `https://www.logocutsvg.com` |
| Country | United States |
| Location option | Presence: people in or regularly in the United States |
| Language | English |
| Networks | Google Search only |
| Search partners | Off |
| Display Network | Off |
| Performance Max | Not used |
| AI Max / keywordless expansion | Off |
| Dynamic Search Ads | Off |
| Budget type | Campaign total budget |
| Total budget | USD 35 |
| Duration | Seven calendar days |
| Planned average | USD 5 per day |
| Bidding | Maximize Clicks |
| Maximum CPC bid limit | USD 1.00 |
| Ad schedule | All days, all hours |
| Devices | All; no bid adjustments |
| Audiences | None targeted; no audience expansion |
| Demographics | All |
| Ad rotation | Optimize |
| Auto-apply recommendations | Off |
| Automated budget increases | Off |

Use a campaign total budget of USD 35 with an explicit start date and an end
date seven calendar days later. This preserves the experiment's maximum spend.
An average daily budget can spend up to twice its stated amount on a given day,
while a campaign total budget cannot charge more than its total.

## URL Tracking

Enable Google Ads auto-tagging.

Tracking template:

```text
{lpurl}
```

Campaign-level final URL suffix:

```text
utm_source=google&utm_medium=cpc&utm_campaign=logocut_search_us_first_test&utm_content={campaignid}-{adgroupid}-{creative}-{matchtype}&utm_term={keyword}
```

Do not manually add a `gclid`. Google Ads auto-tagging supplies it. LogoCut
also preserves incoming `gbraid` and `wbraid` values when Google supplies them.

## Ad Group 1: Logo to SVG

Final URL: `https://www.logocutsvg.com/logo-to-svg`

Keywords:

```text
[logo to svg converter]
"convert logo to svg"
```

Responsive search ad headlines:

1. Logo to SVG Converter
2. Convert Your Logo to SVG
3. Free SVG Preview First
4. Cricut-Ready SVG Files
5. Preview Before You Pay
6. No Subscription Required
7. One-Time SVG Conversion
8. Clean SVG, Instant Download
9. Single-Color SVG for $5
10. Layered SVG for $9
11. Both SVG Versions for $12
12. Upload PNG or JPG
13. See Your SVG Before Paying
14. SVG Files for Cut Projects
15. Convert Logos Online

Descriptions:

1. Upload your logo and see a free watermarked SVG preview before choosing to pay.
2. Unlock a Cricut-ready SVG with one-time pricing. No account or subscription.
3. Choose single-color for $5, layered for $9, or get both SVG versions for $12.
4. Preview the conversion first, then unlock and download the clean SVG you choose.

## Ad Group 2: Cricut SVG

Final URL: `https://www.logocutsvg.com/png-to-svg`

Keywords:

```text
[cricut svg converter]
"convert png to svg for cricut"
```

Responsive search ad headlines:

1. Cricut SVG Converter
2. Convert PNG to Cricut SVG
3. Free SVG Preview First
4. Cricut-Ready SVG Files
5. Preview Before You Pay
6. No Subscription Required
7. One-Time SVG Conversion
8. Clean SVG, Instant Download
9. Single-Color SVG for $5
10. Layered SVG for $9
11. Both SVG Versions for $12
12. Upload PNG or JPG
13. See Your SVG Before Paying
14. SVG Files for Cut Projects
15. Convert Images Online

Descriptions:

1. Convert a PNG or JPG and inspect a free watermarked SVG preview before payment.
2. Get a Cricut-ready SVG for cut projects with simple one-time pricing.
3. Choose single-color for $5, layered for $9, or get both SVG versions for $12.
4. No subscription or account. Pay only after you have reviewed the SVG preview.

## Ad Group 3: JPG to SVG

Final URL: `https://www.logocutsvg.com/jpg-to-svg`

Keywords:

```text
[jpg to svg converter]
```

Responsive search ad headlines:

1. JPG to SVG Converter
2. Convert JPG to SVG Online
3. Free SVG Preview First
4. Cricut-Ready SVG Files
5. Preview Before You Pay
6. No Subscription Required
7. One-Time SVG Conversion
8. Clean SVG, Instant Download
9. Single-Color SVG for $5
10. Layered SVG for $9
11. Both SVG Versions for $12
12. Upload Your JPG
13. See Your SVG Before Paying
14. SVG Files for Cut Projects
15. Convert Images Online

Descriptions:

1. Upload a JPG and see a free watermarked SVG preview before choosing to pay.
2. Unlock a Cricut-ready SVG with one-time pricing. No account or subscription.
3. Choose single-color for $5, layered for $9, or get both SVG versions for $12.
4. Preview the conversion first, then unlock and download the clean SVG you choose.

Do not pin headlines or descriptions for this first test.

## Campaign Negative Keywords

Use phrase match unless brackets indicate exact match:

```text
"free svg files"
"free svg download"
"svg clipart"
"svg bundle"
"svg images"
"svg icons"
"svg code"
"svg html"
"svg tutorial"
"how to make svg"
"cricut design space download"
"cricut machine"
"cricut software"
"canva tutorial"
"adobe illustrator tutorial"
"inkscape tutorial"
"vector stock"
"freepik"
[svg meaning]
[svg definition]
[svg jobs]
[svg salary]
[svg wikipedia]
[svg reddit]
[svg youtube]
```

Do not add `free` by itself as a negative keyword because the offer includes a
free preview. Review the Search terms report daily and add only clearly
irrelevant queries.

## Sitelinks

1. **Free SVG Preview**
   - `https://www.logocutsvg.com/#conversion-studio`
   - Preview your image before paying.
   Upload PNG or JPG up to 10 MB.

2. **Logo to SVG**
   - `https://www.logocutsvg.com/logo-to-svg`
   - Convert a logo to clean SVG paths.
   Review a free preview first.

3. **PNG to SVG**
   - `https://www.logocutsvg.com/png-to-svg`
   - Turn PNG artwork into an SVG.
   One-time pricing, no subscription.

4. **JPG to SVG**
   - `https://www.logocutsvg.com/jpg-to-svg`
   - Preview your JPG as an SVG.
   Unlock only when it looks right.

5. **Simple Pricing**
   - `https://www.logocutsvg.com/#pricing`
   - Single $5, layered $9, both $12.
   Pay once with no subscription.

6. **How It Works**
   - `https://www.logocutsvg.com/#how`
   - Upload, preview, then unlock.
   Download after processing.

## Callouts

- Free Preview First
- No Subscription
- One-Time Payment
- Instant Download
- Secure PayPal Checkout
- Both SVGs for $12

## Conversion Configuration

1. Connect the production GA4 web stream to the Google Ads account.
2. Mark GA4 `purchase` as a key event.
3. Import `purchase` into Google Ads as the only Primary conversion:
   - Goal category: Purchase
   - Action optimization: Primary
   - Value: use the GA4 event value
   - Currency: USD
   - Count: Every
   - Click-through window: 30 days
   - Attribution: Data-driven
4. Keep `preview_displayed` and `marketing_opt_in_completed` as Secondary
   observation conversions. Exclude them from account-default campaign goals.
5. Keep `purchase_completed` as an analytics diagnostic event only. Do not
   import it as another Primary conversion or revenue will be double-counted.
6. Do not enable enhanced conversions for this test. LogoCut does not send
   customer email or PayPal payer information to GA4 or Google Ads.

## Launch Checklist

- Production GA4 Measurement ID is installed and verified in Realtime/DebugView.
- A test-mode funnel confirms all requested events and the complete purchase
  item payload without making a real purchase.
- GA4 and Google Ads are linked.
- `purchase` is Primary; preview and signup are Secondary.
- Auto-tagging is enabled.
- Campaign total budget is USD 35 with a seven-day start/end window.
- Search partners, Display Network, AI Max, broad match, and auto-applied budget
  recommendations are off.
- Campaign remains paused until the account owner approves launch.

## Official References

- [GA4 recommended ecommerce events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Google Ads auto-tagging](https://support.google.com/analytics/answer/10723132)
- [Google Ads campaign total budgets](https://support.google.com/google-ads/answer/10486938)
- [Responsive search ads](https://support.google.com/google-ads/answer/7684791)
- [Google Ads keyword match types](https://support.google.com/google-ads/answer/7478529)
- [Presence-only location targeting](https://support.google.com/google-ads/answer/9376662)
