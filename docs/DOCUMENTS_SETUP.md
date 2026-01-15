# Documents Feature Setup

This guide will help you set up the Supabase Storage bucket for the Documents feature.

## Supabase Storage Setup

### 1. Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Use the following settings:
   - **Name**: `user-documents`
   - **Public bucket**: ✓ Enabled (so users can download their documents)
   - **File size limit**: 50MB (adjust as needed)
   - **Allowed MIME types**: Leave empty or add specific types

### 2. Set Up Storage Policies

You need to create RLS (Row Level Security) policies for the storage bucket. Go to **Storage** > **Policies** and add these policies:

#### Policy 1: Allow authenticated users to upload their own documents
```sql
-- Policy name: Users can upload their own documents
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow authenticated users to read their own documents
```sql
-- Policy name: Users can read their own documents
-- Operation: SELECT
-- Target roles: authenticated, anon

CREATE POLICY "Users can read their own documents"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'user-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Allow public read access (if public bucket is enabled)
```sql
-- Policy name: Public read access
-- Operation: SELECT
-- Target roles: anon

CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'user-documents');
```

#### Policy 4: Allow authenticated users to delete their own documents
```sql
-- Policy name: Users can delete their own documents
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Configure CORS (if needed)

If you're accessing files from a different domain, configure CORS in Supabase:

1. Go to **Settings** > **API**
2. Update the CORS settings to include your application domains

## Features

The Documents page now supports:

- ✅ **File Upload**: Upload documents from your PC (PDF, DOC, DOCX, TXT, PNG, JPG)
- ✅ **Cloud Storage**: Files are stored in Supabase Storage
- ✅ **File Download**: Download uploaded documents
- ✅ **File Management**: Delete files when documents are removed
- ✅ **Metadata Tracking**: File name, size, and type are tracked
- ✅ **User Isolation**: Each user can only access their own documents

## File Structure

Files are organized in Supabase Storage as:
```
user-documents/
  ├── {user-id}/
  │   ├── {document-id}/
  │   │   ├── {timestamp}_{filename}
```

This structure ensures:
- User isolation (files are separated by user ID)
- No file conflicts (each document has its own folder)
- Unique filenames (timestamp prefix prevents duplicates)

## Guest Mode

**Guest users can now upload files too!**

- Guest user files are stored locally in IndexedDB as base64-encoded data
- Files are preserved across browser sessions (as long as IndexedDB is not cleared)
- When a guest user signs in, their documents (including files) are migrated to Supabase
- File size limits depend on browser IndexedDB storage limits (typically 50MB+ per origin)

**Storage comparison:**
- **Guest users**: Files stored in IndexedDB (local browser storage)
- **Authenticated users**: Files stored in Supabase Storage (cloud storage)

## Troubleshooting

### Upload fails with "permission denied"
- Check that RLS policies are correctly set up
- Verify the user is authenticated
- Check that the bucket name matches (`user-documents`)

### Can't download files
- Ensure the bucket is set to public OR
- Add proper SELECT policies for authenticated users

### Files not deleting
- Check DELETE policy is in place
- Verify the user owns the file (user ID matches folder structure)
