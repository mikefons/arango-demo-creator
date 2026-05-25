"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CredentialForm } from "@/components/credential-form";

export default function HomePage() {
  const router = useRouter();

  const handleSuccess = useCallback(
    (token: string) => {
      // Store encrypted token in sessionStorage — never persisted to disk
      sessionStorage.setItem("arango_session", token);
      router.push("/workspace");
    },
    [router]
  );

  return <CredentialForm onSuccess={handleSuccess} />;
}
