# TopOne Admin App

## About

This app co-exists with the **TopOne Guest App** — any changes made from the admin app are reflected in the guest app in real time. It connects to a shared Supabase database where the guest app has read-only access, and the admin app has full CRUD (Create, Read, Update, Delete) access.

## What's the point?

To allow salon admins/store owners to:
- Communicate with customers and book them in manually
- Customers choose a service on the guest app and automatically message the admin once a service is selected
- Manually manage promotions (banners), location info, price list (services), and model photo collections
- Book customers by messaging and interacting with them directly through the app

## How to use

1. Clone the repo
2. Run `npm install`
3. Add the `.env` file (see Notes below)
4. Use Android Studio emulator or Xcode for iOS simulator
5. Run `npx expo start`

## Notes

- A `.env` file is required containing your Supabase URL and anon key
- All Supabase tables must be created before running the app

## Required Supabase tables

| Table | Purpose |
|---|---|
| `banners` | Home screen promotional banners |
| `collections` | Yearly model photo collections |
| `locations` | Salon location details |
| `messages` | Customer ↔ admin messaging |
| `profiles` | User profiles and admin codes |
| `services` | Salon service price list |
