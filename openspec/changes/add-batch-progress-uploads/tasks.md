# Implementation Tasks

## 1. Batch Upload Logic
- [ ] 1.1 Add batch size constant (1000 documents per batch)
- [ ] 1.2 Split rawDocuments into batches in handleUpload
- [ ] 1.3 Upload batches sequentially with async/await
- [ ] 1.4 Track upload state (current batch, total batches, uploaded count)
- [ ] 1.5 Handle partial success (some batches succeed, others fail)
- [ ] 1.6 Add cancellation flag and check between batches

## 2. Progress UI
- [ ] 2.1 Add progress state (percentage, current batch, estimated time)
- [ ] 2.2 Create progress bar component with percentage display
- [ ] 2.3 Show batch status ("Uploading batch X of Y...")
- [ ] 2.4 Calculate and display estimated time remaining
- [ ] 2.5 Add cancel button (only shown during upload)
- [ ] 2.6 Disable other wizard controls during upload

## 3. Error Handling
- [ ] 3.1 Handle network errors per-batch (retry logic?)
- [ ] 3.2 Display partial success message (X of Y batches uploaded)
- [ ] 3.3 Show failed batch numbers in error message
- [ ] 3.4 Handle cancellation gracefully (don't call onComplete)

## 4. Testing
- [ ] 4.1 Test small upload (<1k docs - single batch, no progress bar)
- [ ] 4.2 Test medium upload (2-5k docs - multiple batches)
- [ ] 4.3 Test large upload (10k docs - progress tracking)
- [ ] 4.4 Test cancellation (mid-upload, verify partial data)
- [ ] 4.5 Test network error (verify error message shows batch number)
- [ ] 4.6 Test time estimation accuracy

## 5. Documentation
- [ ] 5.1 Update component comments to mention batching
- [ ] 5.2 Add inline comments explaining batch logic

