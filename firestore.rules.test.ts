/**
 * Security Rules Specification Verification Suite for Skill 98
 * Validates that all Dirty Dozen adversarial payloads are rejected.
 */

export interface SecurityPayloadTest {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityPayloadTest[] = [
  { id: 1, name: 'Shadow Field Injection on Product', collectionPath: '/products/prod_1', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 2, name: 'Self-Assigned Admin Role on UserPublic', collectionPath: '/users/user_1', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 3, name: 'Unverified Admin Email Spoof', collectionPath: '/products/prod_1', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 4, name: 'Cross-User PII Read on UserPrivate', collectionPath: '/users/user_1/private/info', operation: 'get', expectedResult: 'PERMISSION_DENIED' },
  { id: 5, name: 'Orphaned Session Creation without Parent User', collectionPath: '/users/user_1/sessions/sess_1', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 6, name: 'Order Buyer Identity Spoofing', collectionPath: '/orders/ord_1', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 7, name: 'Order Terminal State Mutation after Completed', collectionPath: '/orders/ord_1', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 8, name: 'Revoked Session Reactivation Attack', collectionPath: '/users/user_1/sessions/sess_1', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 9, name: 'Value Poisoning on Whitelisted Update Key', collectionPath: '/orders/ord_1', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 10, name: 'Forged Client Timestamp on Order Creation', collectionPath: '/orders/ord_1', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 11, name: 'Document ID Length & Regex Poisoning', collectionPath: '/orders/invalid$id', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 12, name: 'Unauthorized Blanket Order List Scraping', collectionPath: '/orders', operation: 'list', expectedResult: 'PERMISSION_DENIED' }
];
