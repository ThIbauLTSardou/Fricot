# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm install          # install dependencies
npm run ios          # launch iOS Simulator (requires Xcode)
npm run android      # launch Android emulator (requires Android Studio)
npm run web          # launch in browser (limited — some native features won't work)
npm start            # Metro bundler only (scan QR with Expo Go)
npx tsc --noEmit     # type-check without building
```

## Architecture

**Expo ~56.0.9** with file-based routing (`expo-router`), React Native 0.85.3, React 19.

### Data flow

```
Supabase (auth + DB)
    ↓
useAuthStore          ← session, user, groupId (source of truth for group scope)
    ↓
data/repository.ts    ← all DB calls; reads groupId via useAuthStore.getState()
    ↓
useDishStore / useWeekStore / useShoppingStore   ← Zustand, optimistic updates
    ↓
screens (app/)
```

Every authenticated user belongs to exactly one group at all times. On first login, a personal group is auto-provisioned in `provisionGroup()` (`store/useAuthStore.ts`). There is no "no group" state.

### Key files

- `lib/supabase.ts` — Supabase client. **No `<Database>` generic on `createClient`** — removed to avoid `never` type inference; `types/database.ts` exists for reference only.
- `data/repository.ts` — sole layer between stores and Supabase. All table access goes through here. `WeekPlan` keys come back as strings from JSONB; normalized to numbers on read with `Object.fromEntries(Object.entries(raw).map(([k,v]) => [Number(k), v]))`.
- `store/useAuthStore.ts` — auth + group state. `load()` initialises the session and sets up `onAuthStateChange`. Also handles one-shot AsyncStorage → Supabase migration gated by `menus:migrated` key.
- `app/_layout.tsx` — auth gate: shows spinner while `loaded=false`, redirects to `/auth/login` if no session, then wraps tabs in `<DataLoader>` which reloads all stores when `groupId` changes.
- `lib/ThemeContext.tsx` — dark/light theme via React context; consume with `useTheme()`.

### Store pattern

Stores use optimistic updates: apply the change locally first, call the repository, roll back on error. Example in `useDishStore.ts`.

### Navigation structure

```
app/
  _layout.tsx          root layout + auth gate
  (tabs)/              main tab bar (dishes, week, shopping)
  auth/login.tsx        email/password + Google + Apple
  auth/register.tsx
  dish/new.tsx
  dish/[id].tsx
  group/manage.tsx      invite code, members, leave/delete
  group/join.tsx        join via 6-char code
```

### Supabase schema (project: ecksndbmkouamnyyngog)

Tables: `profiles`, `groups`, `group_members`, `dishes`, `week_plans`, `shopping_items`. RLS is enabled on all tables using the helper function `get_my_group_id()`.

### OAuth

Google and Apple OAuth require external configuration (Google Cloud Console / Apple Developer + Supabase Dashboard → Auth → Providers). Buttons exist in `app/auth/login.tsx` but won't work until providers are configured. Apple button is iOS-only (`Platform.OS === 'ios'`).
