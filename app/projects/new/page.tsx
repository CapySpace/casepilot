import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { NewProjectForm } from "./new-project-form";

/**
 * Creating a Project: a name, an optional description, and nothing else to decide.
 *
 * Who owns it is not a question the form asks — the database answers it, giving the creator the
 * Owner Membership as the Project comes into existence.
 */
export default function NewProjectPage() {
  return (
    <div className="w-full max-w-reading">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-headline-sm">Create a project</CardTitle>
          <CardDescription>
            A project is where a team&rsquo;s test cases, builds and results live. You will be its owner,
            and can invite colleagues once it exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
