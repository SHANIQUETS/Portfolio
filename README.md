# 📊 Referral & Hire Performance Dashboard (Power BI)

## Overview

I built this dashboard to analyse referral data and understand how cases move from referral through to hire completion.

The goal was to make it easy to see:

* how many referrals are coming in
* how many are accepted or rejected
* how many actually convert into hires
* where things might be breaking down

---

## What the dashboard shows

* Total referrals, accepted and rejected
* Conversion into hire (based on On Hire Date)
* Completed hires (based on Off Hire Date, not referral date)
* Trends over time
* Breakdown by referrer
* Rejection reasons

---

## Key things I focused on

One important part of this build was making sure the numbers reflect real operations.

For example, completed hires are calculated using the **Off Hire Date**, rather than the referral date. This avoids misleading trends and gives a more accurate view of performance over time.

---

## Data issues I found

While working with the data, I noticed a few problems:

* Status values were inconsistent (e.g. different casing)
* Some date fields were missing or incomplete
* There were cases where the data didn’t fully reflect the referral → hire process

I cleaned and handled these within Power BI to make the reporting more reliable.

---

## What I learned from the data

A noticeable number of referrals don’t convert into hires, and a large share of rejections are due to incomplete information.

This suggests there’s an opportunity to improve the quality of referrals at the source, which could increase conversion rates and reduce wasted effort.

---

## Tools used

* Power BI
* Power Query
* DAX

---

## Why this matters

This kind of dashboard helps teams quickly see where performance is dropping off and where improvements can be made — whether that’s better referral quality, faster processing, or improved tracking.

---

## Dashboard preview

<img width="1536" height="1024" alt="Referral    Hire Performance Dashboard" src="https://github.com/user-attachments/assets/a43bab76-09f4-4d5d-9763-b4293f4ca6fb" />


<img width="1536" height="1024" alt="Breakdown of Rejection" src="https://github.com/user-attachments/assets/4f9eda70-27b2-467c-8bae-0df22d98f993" />

---




