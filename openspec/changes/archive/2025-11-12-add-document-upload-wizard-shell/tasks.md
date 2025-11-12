# Implementation Tasks

## 1. Shell Component Structure
- [x] 1.1 Create `frontend/src/DocumentUploadWizard.jsx` file
- [x] 1.2 Set up component with props (collectionName, serviceName, onClose, onComplete)
- [x] 1.3 Define wizard state structure (currentStep, documents, schema, etc.)
- [x] 1.4 Initialize state with useState hook

## 2. Modal Structure
- [x] 2.1 Implement fixed overlay backdrop (`fixed inset-0` pattern)
- [x] 2.2 Create modal container with `max-w-4xl` width
- [x] 2.3 Add sticky header with title and close button
- [x] 2.4 Add content area for step components
- [x] 2.5 Add sticky footer with navigation buttons
- [x] 2.6 Apply Tailwind styles following HandlerModal pattern

## 3. Step Navigation Logic
- [x] 3.1 Implement handleNext function with validation check
- [x] 3.2 Implement handleBack function
- [x] 3.3 Create canAdvance validation function
- [x] 3.4 Add currentStep state management
- [x] 3.5 Implement conditional button rendering (Next vs Upload)

## 4. Step Validation
- [x] 4.1 Add validation for Step 1 (file uploaded and parsed)
- [x] 4.2 Add validation for Step 2 (text_fields selected)
- [x] 4.3 Add validation for Step 3 (always valid - preview step)
- [x] 4.4 Connect validation to Next button disabled state

## 5. Step Component Integration
- [x] 5.1 Create placeholder FileUploadStep component
- [x] 5.2 Create placeholder FieldMappingStep component
- [x] 5.3 Create placeholder PreviewUploadStep component
- [x] 5.4 Implement conditional step rendering based on currentStep
- [x] 5.5 Pass wizardState and onUpdate callback to each step

## 6. User Interaction
- [x] 6.1 Implement close button handler
- [x] 6.2 Add close confirmation if wizard has data
- [x] 6.3 Implement onComplete callback for successful upload
- [x] 6.4 Add step progress indicator ("Step X of 3")

## 7. Parent Component Integration
- [x] 7.1 Add wizard trigger to Collections component
- [x] 7.2 Implement showUploadWizard state management
- [x] 7.3 Pass collection/service information to wizard
- [x] 7.4 Handle wizard completion callback

## 8. Testing and Polish
- [x] 8.1 Test navigation between all steps
- [x] 8.2 Test validation prevents advancing without data
- [x] 8.3 Test Back button correctly navigates
- [x] 8.4 Test Cancel/close behavior
- [x] 8.5 Verify responsive layout on different screen sizes
- [x] 8.6 Check accessibility (keyboard navigation, focus management)

