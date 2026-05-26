"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CredentialForm } from "@/components/credential-form";

export default function HomePage() {
  const router = useRouter();

  const handleSuccess = useCallback(() => {
    // Cookie is set server-side — just navigate to workspace
    router.push("/workspace");
  }, [router]);

  return <CredentialForm onSuccess={handleSuccess} />;
}
