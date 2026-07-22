import { useEffect } from "react";
import { useLocation } from "wouter";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");

    if (token) {
      window.location.href = `/api/auth/verify-email?token=${token}`;
    }
  }, []);

  return <div>Verifying email...</div>;
}
