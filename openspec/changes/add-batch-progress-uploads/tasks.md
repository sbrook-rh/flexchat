# Implementation Tasks

## 1. Batch Upload Logic
- [x] 1.1 Add batch size constant (1000 documents per batch)
- [x] 1.2 Split rawDocuments into batches in handleUpload
- [x] 1.3 Upload batches sequentially with async/await
- [x] 1.4 Track upload state (current batch, total batches, uploaded count)
- [x] 1.5 Handle partial success (some batches succeed, others fail)
- [x] 1.6 Add cancellation flag and check between batches

## 2. Progress UI
- [x] 2.1 Add progress state (percentage, current batch, estimated time)
- [x] 2.2 Create progress bar component with percentage display
- [x] 2.3 Show batch status ("Uploading batch X of Y...")
- [x] 2.4 Calculate and display estimated time remaining
- [x] 2.5 Add cancel button (only shown during upload)
- [x] 2.6 Disable other wizard controls during upload

## 3. Error Handling
- [x] 3.1 Handle network errors per-batch (shows batch number in error)
- [x] 3.2 Display partial success message (X of Y batches uploaded)
- [x] 3.3 Show failed batch numbers in error message
- [x] 3.4 Handle cancellation gracefully (don't call onComplete)

## 4. Testing
- [x] 4.1 Test small upload (<1k docs - single batch, no progress bar)
- [x] 4.2 Test medium upload (2-5k docs - multiple batches)
- [x] 4.3 Test large upload (10k docs - progress tracking)
- [x] 4.4 Test cancellation (mid-upload, verify partial data)
- [x] 4.5 Test network error (shows batch number, smart retry implemented)
- [x] 4.6 Test time estimation accuracy (11s per batch observed, animation smooth)

## 5. Documentation
- [x] 5.1 Update component comments to mention batching
- [x] 5.2 Add inline comments explaining batch logic

