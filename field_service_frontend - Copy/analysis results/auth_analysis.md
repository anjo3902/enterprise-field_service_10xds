# Authentication Analysis — React Web App

> **Read-only analysis. No code was modified.**

---

## SECTION 1 — Auth Components

### Login Component

**File:** [src/pages/auth/LoginPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/auth/LoginPage.jsx)

**What it does:**
- Maintains local form state: `{ email, password }`
- On mount: calls `consumeSessionExpired()` — if a prior session expired, shows a warning toast and an inline error message
- On submit: calls `login(formData)` from `useAuth` context
- On success: fires a success toast, reads `user.role` from the response, and navigates to the correct workspace (`/admin`, `/technician`, or `/customer`)
- On failure: extracts `err.response.data.detail / .error / .message` and shows both an inline error and an error toast
- Redirects back to `location.state.from.pathname` if the user was redirected to login from a protected route

**Navigation:**
- Links to `/signup`
- After login: `navigate(from || fallbackRoute, { replace: true })`

**Dependencies:**
- `useAuth()` → `login()`
- `useNotification()` → `notification.success / .warning / .error`
- `consumeSessionExpired()` from `services/api.js`
- `useLocation`, `useNavigate` from `react-router-dom`

---

### Signup Component

**File:** [src/pages/auth/SignupPage.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/pages/auth/SignupPage.jsx)

**What it does:**
- Maintains form state: `{ name, email, password, phone, role, technician_code }`
- Default role: `'customer'`
- Conditionally renders a `technician_code` field when `role === 'technician'`
- Runs inline field validation on every change (`validateName`, `validateEmail`, `validatePhone`, `validatePassword`) and full validation on submit
- On submit: calls `authApi.signup()` directly (does **not** use `AuthContext.signup`)
- On success: fires a success toast and navigates to `/login`
- On failure: extracts the error message from the API response same as login
- Submit button is disabled while any field is empty or any `fieldErrors` value is truthy

**Calls API directly:**
```
authApi.signup({ name, email, phone, password, role, technician_code })
```

**Dependencies:**
- `authApi` from `services/api.js` (direct call — no context)
- `useNotification()`
- `sanitizeText`, `validateEmail`, `validateName`, `validatePassword`, `validatePhone` from `utils/validation.js`
- `useNavigate` from `react-router-dom`

---

## SECTION 2 — Auth API Endpoints

Both endpoints are declared inside `authApi` in [src/services/api.js](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/services/api.js).

### Login Endpoint

```
POST  {VITE_API_URL}/auth/login
```

**Request body:**
```json
{ "email": "string", "password": "string" }
```

**Expected response:**
```json
{
  "token": "string",
  "user": {
    "id": "...",
    "role": "customer | technician | admin",
    ...
  }
}
```

**Error shape read by the UI:**
```
response.data.detail  OR  .error  OR  .message
```

**Timeout:** 10 000 ms (standard, not LLM)

---

### Signup Endpoint

```
POST  {VITE_API_URL}/auth/signup
```

**Request body:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  "role": "customer | technician | admin",
  "technician_code": "string (optional)"
}
```

**Expected response:** not consumed — success is detected by no exception being thrown.  
**Error shape read by UI:** `response.data.error OR .detail OR .message`

---

### Token Exchange (Telegram/Workspace Deep-link)

```
POST  {VITE_API_URL}/auth/telegram/claim
```

**Request body:**
```json
{ "token": "string", "job_id": "string" }
```

**Used by:** `ProtectedRoute` when a `?token=` query param is present on a technician job URL.  
**Response shape:** same as `/auth/login` — `{ token, user }`.

---

## SECTION 3 — JWT Handling, Token Storage, Protected Route Logic

### JWT Handling

**Location:** [src/context/AuthContext.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/context/AuthContext.jsx)

The backend currently issues **opaque tokens** (non-JWT). The code is written to handle both opaque tokens and JWTs transparently:

```
decodeTokenPayload(token)
  → splits on "."
  → base64-decodes part[1]
  → returns JSON payload or null if not a valid JWT
```

**`isTokenExpired(token)` logic:**
- If no token → expired
- If JWT with `exp` claim → expired if `Date.now() >= (exp - 60) * 1000` (60-second buffer)
- If opaque (no `exp`) → treated as **not expired** — the server's 401 response handles it

**`role` derivation (priority order):**
1. JWT payload `role` field (if the token is a JWT)
2. `user.role` from the login response (current active path for opaque tokens)

**Token expiry polling:**  
`useEffect` runs `setInterval` every 60 000 ms. If expired:
- If there was an active session → `markSessionExpired()` (sets `fsm_session_expired` flag in sessionStorage)
- Calls `logout()` → redirects to `/login`

**Cross-tab sync:**  
`authChannel.js` uses the browser `BroadcastChannel` API (`fsm_auth_sync` channel) to broadcast `LOGIN` / `LOGOUT` events between tabs in the same origin.

---

### Token Storage

**Primary storage:** `sessionStorage`  
**Storage keys:**

| Key | Value | Set by |
|---|---|---|
| `fsm_token` | Bearer token string | `setAuthToken()` in `api.js` |
| `fsm_user` | JSON-stringified user object | `setStoredUser()` in `api.js` |
| `fsm_had_active_session` | `'1'` or removed | `setHadActiveSession()` in `api.js` |
| `fsm_session_expired` | `'1'` or removed | `markSessionExpired()` / `consumeSessionExpired()` in `api.js` |

**Two-layer storage architecture (`secureStorage.js`):**

```
Layer 1: in-memory Map        ← fastest, lost on page refresh
Layer 2: sessionStorage       ← survives page refresh, cleared on tab close
```

On first access, `secureStorage` checks `localStorage` for legacy keys (`fsm_token`, `fsm_user`), migrates them to `sessionStorage`, then deletes the `localStorage` copies.

> **Important:** The actual `api.js` token helpers (`getSessionItem`, `setSessionItem`) call `sessionStorage` **directly**, not through the `secureStorage` module. `secureStorage.js` is a separate, additional abstraction that exists alongside the direct calls.

**Why `sessionStorage` over `localStorage` (documented in `secureStorage.js`):**
- `sessionStorage` clears on tab/browser close → stolen tokens expire faster
- Scoped to one tab → smaller XSS attack surface
- `localStorage` is deliberately avoided by design

**Token flow on login:**
```
authApi.login()
  → returns { token, user }
  → setAuthToken(token)    → sessionStorage.setItem('fsm_token', token)
  → setStoredUser(user)    → sessionStorage.setItem('fsm_user', JSON.stringify(user))
  → React state: setToken(), setUser()
  → setHadActiveSession(true)
  → setMonitoringUser(user) [Sentry]
  → broadcastLogin(token, user) [BroadcastChannel → other tabs]
```

**Token flow on logout:**
```
logout()
  → broadcastLogout()
  → setToken('')
  → setUser(null)
  → clearAuth()  → sessionStorage.removeItem('fsm_token' + 'fsm_user')
  → setMonitoringUser(null)
```

**401 Interceptor (Axios — `api.js`):**
```
response status 401
  → read hadActiveSession
  → clearAuth()
  → if hadActiveSession → markSessionExpired()
  → window.location.href = '/login'
```

---

### Protected Route Logic

**File:** [src/components/ProtectedRoute.jsx](file:///c:/Users/ANJO%20JAISON/Downloads/field_service_frontend/frontend_react/src/components/ProtectedRoute.jsx)

**Usage in `App.jsx`:**
```jsx
<ProtectedRoute role='customer'>
  <CustomerLayout />
</ProtectedRoute>
```

**Decision tree (executed on every render):**

```
1. Is there a ?token= param AND role === 'technician' AND NOT authenticated?
   → call loginWithToken({ token, jobId }) [token exchange]
   → show "Opening technician workspace..." spinner
   → on success: strip ?token= from URL, proceed

2. Is bootstrapping (token exchange in flight)?
   → show loading screen

3. isAuthenticated === false?
   → <Navigate to='/login' state={{ from: location }} />

4. user.role !== required role?
   → <Navigate to={rolePath[user.role] || '/login'} />
   (auto-redirects to the user's own workspace)

5. All checks pass?
   → render children
```

**`isAuthenticated` is derived as:**
```js
Boolean(token && user && !isTokenExpired(token))
```

All three conditions must be true simultaneously.

**Provider tree order (from `main.jsx`):**
```
ErrorBoundary
  BrowserRouter
    AuthProvider      ← token/user state lives here
      SWRProvider
        NotificationProvider
          App (Routes, ProtectedRoute)
```

---

## SECTION 4 — React Native Migration Analysis

> **Analysis only. No implementation provided.**

This section identifies every web-specific auth mechanism and maps it to its React Native equivalent.

---

### Storage Migration: `sessionStorage` → `AsyncStorage`

This is the core change. **Every `sessionStorage` call becomes an `AsyncStorage` call.**

#### Affected File: `src/services/api.js`

The three helpers `getSessionItem`, `setSessionItem`, `removeSessionItem` call `sessionStorage` synchronously.

| React Web | React Native |
|---|---|
| `sessionStorage.getItem(key)` — sync | `await AsyncStorage.getItem(key)` — **async** |
| `sessionStorage.setItem(key, value)` — sync | `await AsyncStorage.setItem(key, value)` — **async** |
| `sessionStorage.removeItem(key)` — sync | `await AsyncStorage.removeItem(key)` — **async** |

**Impact:** All functions that call these helpers become async:
- `getAuthToken()` — currently sync, must become `async`
- `setAuthToken(token)` — must become `async`
- `setStoredUser(user)` — must become `async`
- `getStoredUser()` — must become `async`
- `clearAuth()` — must become `async`
- `setHadActiveSession()` — must become `async`
- `getHadActiveSession()` — must become `async`
- `markSessionExpired()` — must become `async`
- `consumeSessionExpired()` — must become `async`

#### Affected File: `src/lib/secureStorage.js`

The `secureStorage.get()` / `.set()` / `.remove()` / `.clear()` methods all call `sessionStorage` directly.

| React Web | React Native |
|---|---|
| `memory Map` (in-memory fallback) | Can keep a `Map` for in-memory layer — **no change needed** |
| `sessionStorage` backing store | `AsyncStorage` backing store — all methods become `async` |
| `localStorage` migration on first access | **Drop entirely** — `localStorage` does not exist in React Native |

#### Affected File: `src/context/AuthContext.jsx`

| Web behaviour | React Native equivalent |
|---|---|
| `useState(() => getAuthToken())` — sync initializer reads sessionStorage | Must initialize state as `null / ''` and load token in a `useEffect` with `await AsyncStorage.getItem()` |
| `useEffect(() => setAuthToken(token), [token])` — sync write | Must `await AsyncStorage.setItem(...)` inside the effect |
| `getStoredUser()` in initial `useState` | Must move to `useEffect` with `await AsyncStorage.getItem()` |
| `setMonitoringUser(user)` via Sentry | `@sentry/react-native` — package changes, API stays the same |

---

### Navigation Migration: `react-router-dom` → React Navigation

| React Web | React Native |
|---|---|
| `<BrowserRouter>` + `<Routes>` + `<Route>` | `<NavigationContainer>` + Stack/Tab/Drawer navigators |
| `useNavigate()` → `navigate('/login')` | `useNavigation()` → `navigation.navigate('Login')` |
| `useLocation()` → `location.state.from` | `useRoute()` → `route.params` |
| `<Navigate to='/login' replace />` | `navigation.replace('Login')` |
| `<Link to='/signup'>` | `<TouchableOpacity onPress={() => navigation.navigate('Signup')}>` |

---

### Protected Route Migration

| React Web (`ProtectedRoute.jsx`) | React Native equivalent |
|---|---|
| Renders `<Navigate to='/login'>` as a React element | Calls `navigation.replace('Login')` imperatively inside `useEffect` |
| `useLocation` to capture `from` path for redirect | Pass `route.params.from` as navigation param |
| Renders children directly if auth passes | Renders the screen component if auth passes |
| URL query param `?token=` for deep-link token exchange | Deep-link URL scheme via `expo-linking` or React Navigation `linking` config |

---

### Cross-Tab Sync: `BroadcastChannel` → Not Applicable

| React Web (`authChannel.js`) | React Native |
|---|---|
| `BroadcastChannel('fsm_auth_sync')` — syncs login/logout across browser tabs | **No equivalent.** React Native apps run as a single process — there are no tabs |
| `broadcastLogin()` / `broadcastLogout()` | **Remove entirely.** The entire `authChannel.js` file has no React Native equivalent |

---

### Session Expiry Flag Migration

| React Web | React Native |
|---|---|
| `sessionStorage.setItem('fsm_session_expired', '1')` | `await AsyncStorage.setItem('fsm_session_expired', '1')` |
| `consumeSessionExpired()` — read and clear flag, called in `LoginPage` `useEffect` | Same logic, but all reads/writes are `await`-based |
| Displayed on login page via `useEffect` on mount | Same pattern works in React Native `useEffect` |

---

### `window.location.href` → Navigation Imperative Call

| React Web | React Native |
|---|---|
| `window.location.href = '/login'` (in 401 interceptor, `AuthContext` expiry check) | No `window` object. Must call a navigation function from outside React (Axios interceptor is outside the component tree) |
| Redirect from Axios response interceptor | Requires a navigation ref: `navigationRef.current?.replace('Login')` |

> This is the most architecturally significant difference. The Axios 401 interceptor in `api.js` currently navigates imperatively via `window.location`. In React Native, a **navigation reference** must be created outside the component tree and passed into the Axios interceptor setup.

---

### Token Lifetime / Expiry Polling

| React Web | React Native |
|---|---|
| `setInterval` in `useEffect` — runs every 60 s while app is in browser tab | `setInterval` in `useEffect` still works in React Native |
| On expiry: `window.location.href = '/login'` | On expiry: `navigationRef.current?.replace('Login')` |
| App suspends when tab is in background | App may be backgrounded. React Native's `AppState` API can be used to re-check token on foreground resume |

---

### `sessionStorage` Lifecycle vs `AsyncStorage` Lifecycle

| Characteristic | `sessionStorage` (Web) | `AsyncStorage` (React Native) |
|---|---|---|
| **Cleared on app close** | Yes — cleared when tab/browser closes | **No** — persists across app restarts by default |
| **Shared across tabs** | No — tab-scoped | No equivalent — single process |
| **Encrypted at rest** | No | No (use `react-native-encrypted-storage` for encryption) |
| **Async API** | No — synchronous | Yes — all operations return Promises |

> **Security note:** Because `AsyncStorage` persists across restarts (unlike `sessionStorage`), the React Native implementation must add explicit logout-on-exit logic or use an expiry timestamp stored alongside the token to replicate the "cleared on close" behavior of `sessionStorage`.

---

### Sentry Monitoring Migration

| React Web | React Native |
|---|---|
| `@sentry/react` | `@sentry/react-native` |
| `Sentry.init(...)` — same config keys | Same API, different package |
| `import.meta.env.VITE_SENTRY_DSN` | Environment variable via `react-native-config` or Expo's `Constants.expoConfig.extra` |

---

### Complete File-by-File Migration Summary

| File | Migration Required | Notes |
|---|---|---|
| `pages/auth/LoginPage.jsx` | **Yes** | Replace HTML form + CSS classes with RN TextInput/TouchableOpacity; replace `useNavigate` with `useNavigation`; remove `Link` |
| `pages/auth/SignupPage.jsx` | **Yes** | Same as LoginPage; role picker becomes `Picker` or custom modal |
| `context/AuthContext.jsx` | **Yes** | All storage reads become `async`; remove `BroadcastChannel` calls; replace `window.location.href` |
| `services/api.js` | **Yes** | `sessionStorage` → `AsyncStorage` (all 3 helpers); `window.location.href` → `navigationRef` |
| `lib/secureStorage.js` | **Yes** | Drop `localStorage` migration entirely; `sessionStorage` → `AsyncStorage`; all methods become `async` |
| `lib/authChannel.js` | **Remove** | `BroadcastChannel` has no React Native equivalent |
| `lib/monitoring.js` | **Yes** | `@sentry/react` → `@sentry/react-native`; `import.meta.env` → RN env config |
| `hooks/useAuth.js` | **Minimal** | Pattern stays the same; just consumes `AuthContext` |
| `components/ProtectedRoute.jsx` | **Replace** | No JSX render-redirect in RN; use a navigator-level auth guard instead |
| `hooks/useNotification.js` | **Replace** | No browser toast API; use `react-native-toast-message` or similar |
