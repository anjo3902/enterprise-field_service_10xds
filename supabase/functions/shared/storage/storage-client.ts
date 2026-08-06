/**
 * storage/storage-client.ts
 * ─────────────────────────────────────────────────────────────────
 * Supabase Storage admin operations.
 * Wraps the Supabase JS Storage client with typed helpers.
 *
 * Usage:
 *   const url = await createSignedUrl("ticket-evidence", path, 120);
 */

import { adminClient } from "../db/client.ts";
import { InternalError } from "../errors/app-error.ts";
import type { BucketName } from "./path-builder.ts";

/**
 * Generates a signed URL for a private bucket object.
 *
 * @param bucket      The bucket name
 * @param objectPath  Full object path within the bucket
 * @param expiresIn   TTL in seconds (default: 60)
 */
export async function createSignedUrl(
  bucket: BucketName,
  objectPath: string,
  expiresIn = 60,
): Promise<string> {
  const { data, error } = await adminClient()
    .storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new InternalError(`Failed to generate signed URL for '${bucket}/${objectPath}': ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Returns the public URL of an object in a public bucket.
 * (No auth required — object must be in a public bucket.)
 */
export function getPublicUrl(bucket: BucketName, objectPath: string): string {
  const { data } = adminClient()
    .storage
    .from(bucket)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

/**
 * Deletes one or more objects from a bucket.
 * Used by virus scanner to quarantine infected files.
 */
export async function deleteObjects(
  bucket:      BucketName,
  objectPaths: string[],
): Promise<void> {
  const { error } = await adminClient()
    .storage
    .from(bucket)
    .remove(objectPaths);

  if (error) {
    throw new InternalError(`Failed to delete objects from '${bucket}': ${error.message}`);
  }
}

/**
 * Moves an object to a new path within the same bucket.
 * Used for renaming temp uploads to final paths.
 */
export async function moveObject(
  bucket:  BucketName,
  fromPath: string,
  toPath:   string,
): Promise<void> {
  const { error } = await adminClient()
    .storage
    .from(bucket)
    .move(fromPath, toPath);

  if (error) {
    throw new InternalError(`Failed to move object in '${bucket}': ${error.message}`);
  }
}
