import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

// Make sure to set your publishable key in the environment variables or directly here
// Recommended approach is using environment variables for security
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// Check if we have a valid publishable key
const isClerkEnabled = publishableKey && 
  publishableKey.startsWith("pk_") && 
  publishableKey.length > 10 && 
  !publishableKey.includes("pkhfjkfejhfhjvfniluashdnuihfncufheiuwhniuvhreihierdehuigfr");

// If the publishable key is missing or invalid, show a helpful error
if (!isClerkEnabled) {
  console.warn("Valid Clerk publishable key not found. Clerk authentication will be disabled.");
  console.info("The application will fall back to the traditional authentication system.");
}

// Conditionally wrap App with ClerkProvider only if Clerk is enabled
const root = createRoot(document.getElementById("root")!);

if (isClerkEnabled) {
  root.render(
    <ClerkProvider publishableKey={publishableKey}>
      <App clerkEnabled={isClerkEnabled} />
    </ClerkProvider>
  );
} else {
  root.render(
    <App clerkEnabled={isClerkEnabled} />
  );
}
