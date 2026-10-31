"use client";

import { LoginForm } from "../../components/LoginForm";
import { RequireGuest } from "../../components/AuthProvider";

export default function LoginPage() {
  return (
    <RequireGuest>
      <LoginForm />
    </RequireGuest>
  );
}
