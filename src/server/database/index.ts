export {
  type SqlEngineKind,
  DATA_DIR,
  BACKUP_DIR,
  SQLITE_PATH,
  TABLE_METADATA,
  formatPersianDateTime,
  getActiveEngine,
  dbQuery,
  dbExec,
  closeDatabaseCleanly,
} from './connection.js';

export { initDatabase } from './schema.js';

export {
  getSetting,
  setSetting,
  writeSystemLog,
  getSystemLogs,
  clearAllSystemLogs,
} from './settingsLogsRepo.js';

export {
  type DbUserRow,
  type DbAuthSessionRow,
  findUserByPhone,
  findUserByEmail,
  countSuperAdmins,
  upsertUserByPhone,
  resolveSessionTtlHours,
  createAuthSession,
  findAuthSession,
  deleteAuthSession,
  revokeAuthSessionByToken,
  listActiveAuthSessions,
  listAdminUsers,
  upsertAdminUser,
  deleteAdminUserByPhone,
  addClaimedSkillsToUser,
} from './usersSessionsRepo.js';

export {
  getAllPaymentGateways,
  saveAllPaymentGateways,
  getAllSmsTriggers,
  saveAllSmsTriggers,
  getStorefrontBootstrapData,
  syncCmsEntities,
} from './catalogOrdersRepo.js';

export {
  getDatabaseStatus,
  runDatabaseReadWriteHealthTest,
  executeReadOnlySql,
  generateFullBackupPayload,
  sendSmtpBackupEmail,
  sendBaleNotification,
  createBackupSnapshot,
  getBackupHistory,
  getBackupFileById,
  restoreBackupFromContent,
} from './backupService.js';

export { renderSmsTemplate, dispatchEventSms } from './smsService.js';
