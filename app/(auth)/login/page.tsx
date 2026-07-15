"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type AuthFormState } from "../actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      Log in
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState<AuthFormState, FormData>(login, {});

  return (
    <Card>
      <CardBody className="p-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-soft">Log in to keep studying with Nova.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@school.edu" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
          )}
          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          New to Nova?{" "}
          <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
