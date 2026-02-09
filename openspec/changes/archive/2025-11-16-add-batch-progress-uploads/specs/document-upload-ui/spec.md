# document-upload-ui Spec Deltas

## ADDED Requirements

### Requirement: Batched Upload with Progress
The system SHALL upload large document sets in batches with real-time progress feedback and cancellation support.

#### Scenario: Small upload uses single batch
- **GIVEN** user uploads a file with 800 documents
- **WHEN** upload begins
- **THEN** documents are sent in a single request (no batching)
- **AND** upload completes without showing progress bar
- **AND** success message displays immediately

#### Scenario: Large upload splits into batches
- **GIVEN** user uploads a file with 5,000 documents
- **WHEN** upload begins
- **THEN** documents are split into 5 batches of 1,000 each
- **AND** batches are uploaded sequentially
- **AND** each batch waits for previous batch to complete

#### Scenario: Progress bar displays batch status
- **GIVEN** user uploads 5,000 documents (5 batches)
- **WHEN** batch 3 is uploading
- **THEN** progress bar shows "Uploading batch 3 of 5"
- **AND** progress bar shows "60%" completion
- **AND** displays "3,000 of 5,000 documents uploaded"

#### Scenario: Estimated time remaining updates
- **GIVEN** batch 1 took 25 seconds to upload
- **WHEN** batch 2 starts
- **THEN** estimated time remaining shows "~1-2 minutes"
- **AND** estimate updates after each batch based on average time

#### Scenario: User cancels upload mid-batch
- **GIVEN** user uploads 5,000 documents
- **AND** batches 1 and 2 have completed successfully
- **WHEN** user clicks Cancel button during batch 3
- **THEN** current batch completes (not aborted mid-request)
- **AND** remaining batches (4, 5) are not sent
- **AND** wizard displays "Upload cancelled. 2,000 of 5,000 documents uploaded."
- **AND** onComplete callback is not called
- **AND** wizard remains open for user to retry or close

#### Scenario: Batch upload fails
- **GIVEN** user uploads 5,000 documents
- **AND** batches 1 and 2 succeed
- **WHEN** batch 3 fails with network error
- **THEN** upload stops immediately
- **AND** error message shows "Upload failed at batch 3 of 5. 2,000 documents uploaded successfully."
- **AND** wizard remains open for user to retry
- **AND** onComplete callback is not called

#### Scenario: All batches succeed
- **GIVEN** user uploads 5,000 documents
- **WHEN** all 5 batches complete successfully
- **THEN** success message shows "Successfully uploaded 5,000 documents"
- **AND** onComplete callback is called with combined result
- **AND** parent component refreshes collections list

#### Scenario: Progress UI disables controls
- **GIVEN** upload is in progress
- **WHEN** wizard is rendering
- **THEN** Back button is disabled
- **AND** Cancel button is shown (replaces Upload button)
- **AND** wizard close button is disabled
- **AND** step navigation is disabled

#### Scenario: Batch size constant
- **GIVEN** system configuration
- **WHEN** batching logic initializes
- **THEN** batch size is set to 1,000 documents per batch
- **AND** last batch may contain fewer documents (remainder)

#### Scenario: Single-batch threshold
- **GIVEN** upload contains 999 or fewer documents
- **WHEN** upload begins
- **THEN** single-batch mode is used (no progress bar)
- **GIVEN** upload contains 1,000 or more documents
- **THEN** batched mode with progress bar is used

