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

# 📊 Cash Flow & Payment Performance Dashboard

## Overview

This project analyses weekly cash collection and payment performance across multiple channels, with a focus on understanding trends, channel contribution, and variance against previous periods.

The dashboard was designed to provide both a high-level executive view and a detailed operational breakdown.

---

## Objectives

* Track total cash collection and payment volumes
* Analyse contribution by payment channel
* Compare performance against previous year
* Identify key drivers of positive and negative variance

---

## Dashboard Structure

### Executive Overview

Provides a high-level summary of performance:

* Total weekly and month-to-date cash
* Payment volumes
* Variance vs previous year
* Trends over time
* Channel contribution

### Detailed Breakdown

Provides a granular view by payment channel, including:

* Weekly amounts
* Percentage contribution
* MTD performance
* Variance vs previous year

---

## Key Insights

* Direct Debit (DD) accounts for the majority of cash collection (~72%), making it a critical driver of overall performance.
* Negative variance vs previous year is largely driven by declines in key payment channels.
* Some smaller channels show positive growth, indicating potential areas for expansion.

---

## Tools Used

* Power BI (or equivalent reporting tool)
* Data modelling and aggregation
* Business performance analysis

---

## Business Value

This dashboard enables stakeholders to:

* Monitor cash performance in real time
* Identify underperforming channels
* Make informed decisions on payment strategy
* Improve forecasting and operational planning

---

## Dashboard Preview

<img width="1138" height="755" alt="Cash By Paypoint MTD" src="https://github.com/user-attachments/assets/a36adfb1-cd12-461a-94a3-b0888ab21dc1" />

<img width="1536" height="1024" alt="Cash By Paypoint YTD" src="https://github.com/user-attachments/assets/8ab5e59f-359f-4c35-b5fa-1c54d356622b" />


---




