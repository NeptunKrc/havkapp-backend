export enum FileStatus {
  UPLOADED = 'UPLOADED',
  ATTACHED = 'ATTACHED',
  DELETING = 'DELETING',
  DELETED = 'DELETED',
}

export enum FileOwnerType {
  EXCUSE = 'EXCUSE',
  PROFILE = 'PROFILE',
  DOCUMENT = 'DOCUMENT',
}

export enum StorageProvider {
  LOCAL = 'local',
  SUPABASE = 'supabase',
  S3 = 's3',
}
