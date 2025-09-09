import { Suspense } from "react";
import LoginPageView from "@/components/auth/LoginPageView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPageView />
    </Suspense>
  );
}
