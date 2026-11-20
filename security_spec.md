# Skill 98 (اسکیل ۹۸) — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny & Valid IDs**: Every document ID (`productId`, `userId`, `docId`, `sessionId`, `orderId`) on single-document operations (`get`, `create`, `update`, `delete`) must match `^[a-zA-Z0-9_\-]+$` and be `<= 128` chars.
2. **Role & Admin Integrity**: Admin access requires verified email (`request.auth.token.email_verified == true`) matching the bootstrapped admin (`3mad.aria@gmail.com`) or existence of `/admins/$(request.auth.uid)`. Regular users can never self-assign `role: 'admin'`.
3. **PII Isolation**: User email and phone numbers are stored strictly in `/users/{userId}/private/{docId}` and never exposed in `/users/{userId}`. Only the owner (`request.auth.uid == userId`) or an admin can read/write private documents.
4. **Master Gate for Subcollections**: Every write to `/users/{userId}/private/{docId}` and `/users/{userId}/sessions/{sessionId}` verifies parent `/users/{userId}` ownership (`get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`).
5. **Temporal & Identity Immutability**: `createdAt` and `updatedAt` must equal `request.time`. Ownership fields (`uid`, `buyerId`, `authorId`, `createdAt`) cannot be mutated on `update`.
6. **Terminal State Locking**: Orders in `'completed'` or `'cancelled'` status and Sessions in `'revoked'` status cannot be updated by non-admins.
7. **Secure List Queries**: `allow list` on `/orders` requires `resource.data.buyerId == request.auth.uid || isAdmin()`. `allow list` on `/products` requires `resource.data.status == 'published' || isAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Product**: Adding `"isSuperFeatured": true` to `/products/prod-1` (Blocked by `hasOnly`).
2. **Self-Assigned Admin Role**: Creating `/users/user-1` with `"role": "admin"` by a non-admin UID (Blocked by `incoming().role == 'customer' || isAdmin()`).
3. **Unverified Admin Email Spoof**: Calling admin product creation with `email == '3mad.aria@gmail.com'` but `email_verified == false` (Blocked by `request.auth.token.email_verified == true`).
4. **Cross-User PII Read**: Authenticated user `user-2` attempting `get` on `/users/user-1/private/info` (Blocked by `isOwner(userId) || isAdmin()`).
5. **Orphaned Session Creation**: Creating `/users/user-1/sessions/sess-1` when `/users/user-1` does not exist (Blocked by Master Gate `get()` parent check).
6. **Order Identity Spoofing**: User `user-1` creating an order with `"buyerId": "user-2"` (Blocked by `incoming().buyerId == request.auth.uid`).
7. **Order Terminal State Mutation**: User `user-1` updating an order whose `existing().status == 'completed'` back to `'pending'` (Blocked by Terminal State Lock).
8. **Session Revival Attack**: User `user-1` updating a `'revoked'` session back to `'active'` (Blocked by Terminal State Lock `existing().status == 'active'`).
9. **Value Poisoning on Update**: Updating `Order.status` with a 1MB string or integer `999` (Blocked by `isValidOrder(incoming())` wrapping `allow update`).
10. **Forged Client Timestamp**: Creating a product or order with a past/future `createdAt` instead of `request.time` (Blocked by `incoming().createdAt == request.time`).
11. **ID Poisoning Attack**: Creating a document with a 500-char or special-char ID (Blocked by `isValidId()`).
12. **Blanket Order List Scraping**: Querying `/orders` without filtering `buyerId == request.auth.uid` (Blocked by `allow list` checking `resource.data.buyerId == request.auth.uid`).
