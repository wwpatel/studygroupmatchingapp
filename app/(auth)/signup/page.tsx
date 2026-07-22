"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signup, type AuthFormState } from "../actions";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      Create account
    </Button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState<AuthFormState, FormData>(signup, {});

  return (
    <Card>
      <CardBody className="p-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Join Nova</h1>
        <p className="mt-1 text-sm text-ink-soft">Set up your study profile in a minute.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" placeholder="Jordan Lee" required />
          </div>
          <div>
            <Label htmlFor="email">School email</Label>
            <Input id="email" name="email" type="email" placeholder="you@school.edu" required />
          </div>
          <div>
            <Label htmlFor="grade">Grade</Label>
            <Input id="grade" name="grade" placeholder="11th grade" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="At least 6 characters" required />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
          )}
          {state?.success && (
            <p className="rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage-deep">{state.success}</p>
          )}
          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-2">
            Log in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
