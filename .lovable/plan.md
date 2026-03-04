

# Ghostwriting Mastery Course Platform

## Overview
A modern course platform with affiliate system, Paystack payments, and admin dashboard. Built with React + Tailwind + Supabase (Lovable Cloud).

**Design:** Clean SaaS style (black, white, purple accent), mobile-first, dark mode support.

---

## Phase 1: Foundation

### Database Schema (Supabase)
- **profiles** — name, avatar, bio (linked to auth.users)
- **user_roles** — role enum (admin, student, affiliate) with security definer function
- **courses** — title, description, price, image, published status
- **modules** — course_id, title, order
- **lessons** — module_id, title, type (video/text), video_url, description, order, resources
- **enrollments** — user_id, course_id, enrolled_at
- **lesson_progress** — user_id, lesson_id, completed
- **affiliates** — user_id, referral_code, approved, commission_rate, enabled
- **referral_clicks** — affiliate_id, ip, timestamp
- **sales** — user_id, course_id, amount, affiliate_id, commission_amount, payment_ref, status
- **payouts** — affiliate_id, amount, status (pending/approved/paid)
- **bookmarks** — user_id, lesson_id

### Authentication
- Email + password signup/login with Supabase Auth
- Forgot/reset password flow
- Signup option to register as affiliate (checkbox)
- Auto-create profile + role on signup via database trigger

---

## Phase 2: Public Website

### Landing Page
- Hero section with course title, benefits, CTA ("Enroll Now")
- "What You'll Learn" section
- Course modules preview (3 modules with lesson titles)
- Testimonials section
- Instructor profile
- Pricing section
- FAQ accordion
- Affiliate opportunity section with "Become Affiliate" CTA

---

## Phase 3: Student Experience

### Course Dashboard
- My Courses with progress bars
- "Continue Watching" shortcut
- Completed lessons count

### Course Player
- Sidebar: collapsible modules with lesson list, completion checkmarks
- Main area: YouTube/Vimeo embedded player, lesson description, downloadable resources
- Mark as complete button
- Bookmark lessons
- Search lessons
- Overall progress tracking

---

## Phase 4: Affiliate System

### Referral Tracking
- Unique referral link per affiliate (site.com/?ref=username)
- Store referral in cookie (30-day window)
- Track clicks, attribute sales to affiliates

### Affiliate Dashboard
- Overview: total clicks, sales, earnings, pending/paid commissions
- Referral list with sales history (date, amount, commission)
- Referral link generator with copy button
- Share buttons (Twitter, WhatsApp, Facebook)
- Marketing copy snippets
- Request payout button

### Anti-Fraud
- Prevent self-referrals
- Deduplicate clicks by IP
- Commission only on verified payments

---

## Phase 5: Payments (Paystack)

### Payment Flow
- "Buy Course" → Paystack checkout (edge function)
- On success: webhook verifies payment, grants course access, records sale
- If affiliate referral exists: calculate commission, credit affiliate balance

### Edge Functions
- `create-payment` — initialize Paystack transaction
- `paystack-webhook` — verify payment, grant access, handle affiliate commission

---

## Phase 6: Admin Dashboard

### Course Management
- Create/edit courses, modules, lessons
- Reorder modules and lessons (drag or up/down)
- Lesson form: title, video URL, description (rich text), file upload for resources
- Update course price
- Set affiliate commission percentage

### User Management
- View all users by role
- Approve/disable affiliates
- Manually adjust commissions

### Sales & Analytics
- Daily sales chart (Recharts)
- Total revenue, conversion rate
- Top affiliates leaderboard
- Top traffic sources
- Approve/reject payout requests

---

## Phase 7: Email Automation (Resend)

### Edge function for sending emails via Resend:
- Welcome email on signup
- Course purchase confirmation
- Affiliate approval notification
- Payout confirmation

---

## Phase 8: Extra Features
- Dark mode toggle (next-themes)
- Student profile settings (name, avatar, password)
- Search lessons across course
- Bookmark lessons for quick access

---

## Pages Summary
| Page | Access |
|------|--------|
| Landing Page | Public |
| Login / Signup / Reset Password | Public |
| Course Dashboard | Student |
| Course Player | Student |
| Affiliate Dashboard | Affiliate |
| Admin Dashboard | Admin |
| Admin: Course Management | Admin |
| Admin: Affiliate Management | Admin |
| Admin: Analytics | Admin |
| Profile Settings | All authenticated |

