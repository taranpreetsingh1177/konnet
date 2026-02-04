---
name: Inngest Function Creator
description: Creates Inngest functions based on user requirements following best practices for workflows, error handling, and step organization.
---

# Inngest Function Best Practices

## File Organization
1. **Create separate files** - Each Inngest function should be created in its own file within the `inngest/functions` directory, NOT in the main `inngest/functions.ts` file.
2. **Use nested directories by domain** - Organize functions in subdirectories based on their domain/feature area:
   ```
   inngest/
   ├── functions/
   │   ├── campaign/
   │   │   ├── enrich-company.ts
   │   │   ├── send-email.ts
   │   │   └── track-engagement.ts
   │   ├── user/
   │   │   ├── onboarding.ts
   │   │   └── send-welcome-email.ts
   │   └── payment/
   │       ├── process-charge.ts
   │       └── handle-refund.ts
   ```
3. **Naming convention** - Use descriptive kebab-case filenames that clearly indicate the function's purpose (e.g., `enrich-company.ts`, `process-payment.ts`)
4. **Export pattern** - Export the function as the default export from each file
5. **Import in functions.ts** - Import and aggregate all functions in the main `inngest/functions.ts` file:
   ```typescript
   // inngest/functions.ts
   import enrichCompany from './functions/campaign/enrich-company';
   import sendEmail from './functions/campaign/send-email';
   import onboardUser from './functions/user/onboarding';
   
   export default [
     enrichCompany,
     sendEmail,
     onboardUser,
     // ... other functions
   ];
   ```

## Workflow Step Design

### step.run() Usage
1. **Wrap all operations** - Every operation that should be retried or tracked should be wrapped in `step.run()`
2. **Descriptive step names** - Use clear, action-oriented names (e.g., `"fetch-user-data"`, `"send-email"`, `"update-database"`)
3. **One responsibility per step** - Each `step.run()` should perform a single logical operation
4. **Return meaningful data** - Always return data from steps that subsequent steps might need

### Error Handling
1. **Explicit error handling** - Wrap `step.run()` calls in try-catch blocks when you need custom error handling
2. **Use NonRetriableError** - For validation errors or business logic failures that shouldn't retry:
   ```typescript
   import { NonRetriableError } from "inngest";
   throw new NonRetriableError("User not found");
   ```
3. **Let retriable errors bubble** - For temporary failures (network, timeouts), let errors propagate naturally for automatic retry

### Return Values and Flow Control
1. **Return success/failure objects** - Return structured data indicating outcome:
   ```typescript
   return { success: true, data: result };
   // or
   return { success: false, error: "reason" };
   ```
2. **Use step results in subsequent steps** - Access previous step results in later steps:
   ```typescript
   const user = await step.run("get-user", async () => {
     return await getUser(userId);
   });
   
   await step.run("send-email", async () => {
     return await sendEmail(user.email);
   });
   ```

## Retry and Timing Configuration

1. **Configure retries** - Set retry attempts based on operation criticality:
   ```typescript
   inngest.createFunction(
     { 
       id: "my-function",
       retries: 3 // or configure per step
     },
     { event: "my.event" },
     async ({ event, step }) => { }
   )
   ```

2. **Use step.sleep() for delays** - Add intentional delays between operations:
   ```typescript
   await step.sleep("wait-before-retry", "5s");
   ```

## Event Patterns

1. **Type-safe events** - Define event types for better DX:
   ```typescript
   type MyEvent = {
     name: "user.created";
     data: { userId: string; email: string };
   };
   ```

2. **Event-driven workflows** - Chain functions by triggering subsequent events:
   ```typescript
   await step.run("trigger-next-step", async () => {
     await inngest.send({
       name: "user.onboarding.start",
       data: { userId: event.data.userId }
     });
   });
   ```

## Complete Example Pattern

```typescript
import { inngest } from "@/inngest/client";
import { NonRetriableError } from "inngest";

export default inngest.createFunction(
  { 
    id: "process-user-signup",
    retries: 2
  },
  { event: "user.signup" },
  async ({ event, step }) => {
    // Step 1: Validate input
    const validation = await step.run("validate-input", async () => {
      if (!event.data.email) {
        throw new NonRetriableError("Email is required");
      }
      return { valid: true };
    });

    // Step 2: Create user record
    const user = await step.run("create-user", async () => {
      return await createUserInDB(event.data);
    });

    // Step 3: Send welcome email (with retry)
    await step.run("send-welcome-email", async () => {
      return await sendEmail({
        to: user.email,
        template: "welcome"
      });
    });

    // Step 4: Trigger onboarding workflow
    await step.run("trigger-onboarding", async () => {
      await inngest.send({
        name: "user.onboarding.start",
        data: { userId: user.id }
      });
    });

    return { success: true, userId: user.id };
  }
);
```

## Key Reminders
- ✅ **Always** use `step.run()` for operations that should be tracked and retried
- ✅ **Always** return meaningful data from each step
- ✅ **Always** use NonRetriableError for validation/business logic failures
- ✅ **Always** organize functions in separate files in the `functions` directory
- ✅ **Consider** using `step.sleep()` for rate limiting or scheduled delays
- ✅ **Consider** breaking complex workflows into multiple chained functions via events