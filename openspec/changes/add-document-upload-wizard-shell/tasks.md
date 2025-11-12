# Implementation Tasks

## 1. Shell Component Structure
- [ ] 1.1 Create `frontend/src/DocumentUploadWizard.jsx` file
- [ ] 1.2 Set up component with props (collectionName, serviceName, onClose, onComplete)
- [ ] 1.3 Define wizard state structure (currentStep, documents, schema, etc.)
- [ ] 1.4 Initialize state with useState hook

## 2. Modal Structure
- [ ] 2.1 Implement fixed overlay backdrop (`fixed inset-0` pattern)
- [ ] 2.2 Create modal container with `max-w-4xl` width
- [ ] 2.3 Add sticky header with title and close button
- [ ] 2.4 Add content area for step components
- [ ] 2.5 Add sticky footer with navigation buttons
- [ ] 2.6 Apply Tailwind styles following HandlerModal pattern

## 3. Step Navigation Logic
- [ ] 3.1 Implement handleNext function with validation check
- [ ] 3.2 Implement handleBack function
- [ ] 3.3 Create canAdvance validation function
- [ ] 3.4 Add currentStep state management
- [ ] 3.5 Implement conditional button rendering (Next vs Upload)

## 4. Step Validation
- [ ] 4.1 Add validation for Step 1 (file uploaded and parsed)
- [ ] 4.2 Add validation for Step 2 (text_fields selected)
- [ ] 4.3 Add validation for Step 3 (always valid - preview step)
- [ ] 4.4 Connect validation to Next button disabled state

## 5. Step Component Integration
- [ ] 5.1 Create placeholder FileUploadStep component
- [ ] 5.2 Create placeholder FieldMappingStep component
- [ ] 5.3 Create placeholder PreviewUploadStep component
- [ ] 5.4 Implement conditional step rendering based on currentStep
- [ ] 5.5 Pass wizardState and onUpdate callback to each step

## 6. User Interaction
- [ ] 6.1 Implement close button handler
- [ ] 6.2 Add close confirmation if wizard has data
- [ ] 6.3 Implement onComplete callback for successful upload
- [ ] 6.4 Add step progress indicator ("Step X of 3")

## 7. Parent Component Integration
- [ ] 7.1 Add wizard trigger to Collections component
- [ ] 7.2 Implement showUploadWizard state management
- [ ] 7.3 Pass collection/service information to wizard
- [ ] 7.4 Handle wizard completion callback

## 8. Testing and Polish
- [ ] 8.1 Test navigation between all steps
- [ ] 8.2 Test validation prevents advancing without data
- [ ] 8.3 Test Back button correctly navigates
- [ ] 8.4 Test Cancel/close behavior
- [ ] 8.5 Verify responsive layout on different screen sizes
- [ ] 8.6 Check accessibility (keyboard navigation, focus management)

