# CaseForge Hub

Build a production-ready, responsive web application named CaseForge (or any modern professional name) for IIM Lucknow Case Preparation Portal.

The application should feel similar to Notion + LeetCode + Google Drive + Discord combined, specifically designed for MBA students preparing for Consulting and Product Management interviews.

Use a modern UI with glassmorphism, subtle animations, rounded cards, clean typography and dark/light mode.

Tech Stack

Frontend

 React + TypeScript

 Next.js

 Tailwind CSS

 Shadcn UI

 Framer Motion

 React Query

 React Hook Form

Backend

 Supabase

 PostgreSQL

 Authentication

 Storage

 Edge Functions

 Realtime

Optional AI

 OpenAI GPT

 Claude

 Gemini

State Management

 Zustand

Charts

 Recharts

Deployment Ready

 Vercel

Authentication

Implement complete authentication.

Pages

 Login

 Signup

 Forgot Password

 Reset Password

 Verify Email

Authentication methods

 Email

 Google Login

After login

Redirect users to Dashboard.

User Roles

Student

Can

 Prepare cases

 Upload files

 Host sessions

 Join sessions

 Share repository

 Bookmark cases

 Maintain profile

Admin

Can

 View analytics

 Remove inappropriate files

 Ban users

 Manage categories

 Moderate reports

 View all sessions

Main Navigation

Sidebar

Dashboard

AI Trainer

Repository

Community Repository

Host Session

Join Session

My Sessions

Bookmarks

Notifications

Profile

Settings

Logout

Dashboard

Display

Welcome Card

Current Streak

Cases Solved

Sessions Attended

Repository Uploads

AI Score

Recent Activity Timeline

Upcoming Sessions

Recommended Cases

Trending Community Uploads

Quick Actions

Start AI Case

Upload File

Host Session

Join Session

EPIC 1

AI Trainer Module

(Implement according to User Stories US-01 and US-02.)

AI Home

Choose

Consulting

Product Management

Marketing

Operations

Finance

General Business

Difficulty

Easy

Medium

Hard

Duration

20

30

45

60 minutes

Interview Type

Interviewer-led

Candidate-led

Written Case

Market Entry

Pricing

Growth

Profitability

M&A

Operations

Product Design

Product Strategy

Product Metrics

Generate Case

Click

Generate Case

AI generates

Case Background

Company Overview

Business Context

Problem Statement

Data

Charts

Exhibits

Supporting Information

Timer

Notes Panel

During Case

Student can

Type answers

Upload calculations

Open scratchpad

Pause timer

Resume timer

Mark assumptions

Ask clarifying questions

AI Feedback

When user submits

AI evaluates

Structure

Logic

Framework selection

Hypothesis

Calculations

Business Thinking

Communication

Recommendations

Confidence Score

Overall Score

Generate

Strengths

Weaknesses

Improvement Tips

Suggested Frameworks

Ideal Solution

Previous Attempts

Store

All attempts

Scores

Time taken

Improvement Graph

Feedback History

EPIC 2

Personal Repository

(Implement according to User Stories US-03 and US-04.)

Create Google Drive style interface.

Folders

My Cases

Consulting

PM

Marketing

Operations

Finance

Favorites

Archived

Trash

Upload

Drag Drop

PDF

DOCX

PPT

Excel

Images

ZIP

Metadata

Title

Company

Topic

Framework

Difficulty

Tags

Author

Interview Round

Description

Visibility

Private

Public

Shared

File Operations

Rename

Delete

Move

Download

Duplicate

Share

Preview

Bookmark

Version History

Search

Global Search

Filters

Category

Difficulty

Framework

Author

Tags

Company

Date

Sort

Recent

Popular

Highest Rated

Newest

Community Repository

Students can

Browse public files

Like

Comment

Bookmark

Report

Rate

Download

Follow Contributors

EPIC 3

Multiplayer Group Preparation

(Implement according to User Stories US-05 and US-06.)

Create session scheduling system.

Host Session

Host enters

Title

Description

Category

Consulting

PM

Marketing

Finance

Operations

Capacity

Meeting Link

Date

Time

Duration

Prerequisites

Visibility

Public

Invite Only

Private

Calendar

Monthly

Weekly

Daily

Availability

Conflict Detection

Upcoming Sessions

Join Session

Students can

Browse sessions

Search

Filter

Book slot

Cancel booking

Waitlist

Receive confirmation

Live Discussion Room

Implement

Realtime Chat

Participants List

Host Controls

Raise Hand

Pinned Messages

Shared Notes

Timer

Shared Whiteboard placeholder

Case Documents

Voting

End Session

Feedback Form

Notifications

Real-time

Session booked

Session cancelled

Host started session

Reminder 30 minutes before

Reminder 5 minutes before

AI feedback ready

Repository file shared

Profile

Photo

Bio

Batch

Specialization

LinkedIn

Resume Upload

Skills

Preferred Domains

Statistics

Sessions Hosted

Sessions Joined

Average AI Score

Contribution Score

Leaderboard Rank

Badges

Leaderboard

Weekly

Monthly

Overall

Metrics

Cases Solved

Repository Contribution

Community Rating

Sessions Hosted

Gamification

Badges

100 Cases Solved

Top Mentor

Repository Star

Early Bird

Consistency Streak

Weekly Champion

XP System

Level Progress

Achievements

Notifications Center

Unread

Read

Mark All Read

Delete

Categories

AI

Repository

Sessions

System

Admin Dashboard

Statistics

Daily Active Users

Monthly Active Users

Files Uploaded

Sessions Hosted

Cases Solved

Popular Categories

Top Contributors

Reported Content

Moderation Queue

Database Schema

Users

Profiles

Cases

AI Attempts

AI Feedback

Repositories

Folders

Files

Tags

Bookmarks

Comments

Ratings

Sessions

Session Participants

Notifications

Badges

Achievements

Reports

Admin Logs

Activity Logs

API Design

RESTful APIs

Authentication

Profile CRUD

Case Generation

AI Evaluation

Repository CRUD

File Upload

Search

Session CRUD

Booking

Realtime Chat

Notifications

Bookmarks

Leaderboard

Analytics

Security

JWT Authentication

Row Level Security

Role Based Access

Rate Limiting

CSRF Protection

XSS Protection

Input Validation

Secure File Upload

Email Verification

Password Reset

UX Requirements

Responsive

Mobile

Tablet

Desktop

Loading Skeletons

Optimistic Updates

Infinite Scroll

Toast Notifications

Breadcrumbs

Keyboard Shortcuts

Accessibility

UI Theme

Minimal

Premium

Apple-inspired

Soft shadows

Rounded corners

Gradient accents

Glass cards

Micro interactions

Smooth animations

Dark mode

Light mode

Professional MBA branding

End-to-End User Flows

New User

Landing Page → Sign Up → Verify Email → Login → Dashboard → Complete Profile → Choose AI Trainer → Solve Case → Receive AI Feedback → Save Attempt → Upload Supporting Files → Share Repository → Host/Join Group Session → Earn Badges → Track Progress.

Returning User

Login → Dashboard → Resume Pending AI Case → Review Past Attempts → Upload New Files → Browse Community Repository → Join Scheduled Session → Participate in Live Discussion → Receive Notifications → View Analytics.

Repository Flow

Upload File → Add Metadata → Save as Private/Public → Preview → Search → Bookmark → Share → Community Engagement (Likes, Comments, Ratings, Reports).

Multiplayer Flow

Create Session → Publish → Participants Discover → Book Slot → Receive Reminders → Join Live Discussion → Submit Feedback → Session History Updated.

Admin Flow

Admin Login → Analytics Dashboard → Moderate Reports → Manage Categories → Remove Content → View User Activity → Export Reports.

Expected Deliverable

Generate a complete, production-ready full-stack application with:

 Clean folder structure

 Authentication and role-based authorization

 Database schema and migrations

 Responsive UI

 Working CRUD operations

 AI integration placeholders (or OpenAI-ready endpoints)

 Real-time features for chat and notifications

 Secure file storage and sharing

 Search, filters, bookmarks, and gamification

 Complete end-to-end functionality for all three epics, ensuring every user story from the agile plan is implemented as a working feature rather than a static interface.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://consult-prep-suite.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/640d992e-3749-497f-b194-bfac6ecb4569).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
