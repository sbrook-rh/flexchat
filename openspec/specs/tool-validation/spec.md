# tool-validation Specification

## Purpose
TBD - created by archiving change add-tool-calling. Update Purpose after archive.
## Requirements
### Requirement: Validation Record Tracking
The system SHALL track validation test results for each model to determine tool calling capability.

#### Scenario: Initialize validation record
- **WHEN** a model is tested for the first time
- **THEN** the system creates a validation record with: model_id, tested=false, validated=false, test_count=0, success_count=0, last_tested=null, test_history=[]

#### Scenario: Record successful test
- **WHEN** a tool calling test succeeds
- **THEN** the system updates: tested=true, validated=true, test_count++, success_count++, last_tested=<timestamp>
- **AND** adds test details to test_history array

#### Scenario: Record failed test
- **WHEN** a tool calling test fails
- **THEN** the system updates: tested=true, test_count++, last_tested=<timestamp>
- **AND** adds error details to test_history array
- **AND** validated is recalculated based on success rate

### Requirement: Validation Status Calculation
The system SHALL determine validation status based on an 80% success threshold.

#### Scenario: Calculate validation status
- **WHEN** a model has test results
- **THEN** validation status = (success_count / test_count) >= 0.8
- **AND** a model is validated only if success rate is 80% or higher

#### Scenario: Single success validates
- **WHEN** a model passes its first test
- **THEN** validated = true (1/1 = 100%)

#### Scenario: Partial failures
- **WHEN** a model has 4 successes and 1 failure
- **THEN** validated = true (4/5 = 80%)

#### Scenario: Too many failures
- **WHEN** a model has 3 successes and 2 failures
- **THEN** validated = false (3/5 = 60%)

### Requirement: Validation Query Methods
The system SHALL provide methods to query validation status for models.

#### Scenario: Check if model is validated
- **WHEN** isValidated(modelId) is called
- **THEN** the system returns true if validated, false otherwise
- **AND** returns false for models never tested

#### Scenario: Get validation status
- **WHEN** getStatus(modelId) is called
- **THEN** the system returns the full validation record if exists
- **AND** returns {model_id, tested: false, validated: false} if not tested

#### Scenario: Get all validations
- **WHEN** getAllValidations() is called
- **THEN** the system returns an array of all validation records
- **AND** the array includes both validated and unvalidated models

### Requirement: Test History Tracking
The system SHALL maintain a history of all validation tests for debugging and trend analysis.

#### Scenario: Add test to history
- **WHEN** a validation test completes
- **THEN** an entry is added to test_history with: timestamp, success (boolean), details or error

#### Scenario: Success test history entry
- **WHEN** a test succeeds
- **THEN** the history entry includes: timestamp, success=true, details=<test_details>

#### Scenario: Failure test history entry
- **WHEN** a test fails
- **THEN** the history entry includes: timestamp, success=false, error=<error_message>

#### Scenario: History preserves order
- **WHEN** multiple tests are run
- **THEN** test_history maintains chronological order
- **AND** latest tests appear at the end of the array

### Requirement: Validation Persistence
The system SHALL support optional file-based persistence of validation data.

#### Scenario: Save validation data
- **WHEN** save(filePath) is called
- **THEN** the system serializes validation Map to JSON
- **AND** writes to the specified file path
- **AND** the file contains array of [modelId, record] tuples

#### Scenario: Load validation data
- **WHEN** load(filePath) is called
- **THEN** the system reads the file and parses JSON
- **AND** reconstructs the validation Map from entries
- **AND** if file doesn't exist, logs info message without error

#### Scenario: Load failure handling
- **WHEN** load(filePath) fails (missing file, parse error)
- **THEN** the system logs "[ValidationTracker] No existing validation data found"
- **AND** continues with empty validation Map
- **AND** does not throw an error

### Requirement: UI Integration
The system SHALL display validation badges in model selection interfaces.

#### Scenario: Validated model badge
- **WHEN** a model is validated for tool calling
- **THEN** the UI displays 🔧✓ (wrench + checkmark)
- **AND** the badge indicates successful tool calling validation

#### Scenario: Unvalidated model badge
- **WHEN** a model supports tool calling but is not validated
- **THEN** the UI displays 🔧⚠️ (wrench + warning)
- **AND** the badge indicates tool calling support without validation

#### Scenario: No tool calling support
- **WHEN** a model does not support tool calling
- **THEN** no validation badge is displayed
- **AND** the model appears without indicators

#### Scenario: Tooltip on hover
- **WHEN** the user hovers over a validation badge
- **THEN** a tooltip shows validation status details
- **AND** the tooltip includes: test count, success rate, last tested date

